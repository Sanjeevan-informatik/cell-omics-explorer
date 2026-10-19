"""Bounded AnnData HDF5 reader. Never loads raw, layers, graphs or external links."""

import hashlib
import json
from pathlib import Path

import h5py
import numpy as np

MAX_UPLOAD = 32 * 1024 * 1024
MAX_CELLS = 10_000
MAX_GENES = 5_000
MAX_VALUES = 1_000_000
MAX_PACKAGE = 20 * 1024 * 1024


def label(value):
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    value = str(value)
    if len(value) > 2000:
        raise ValueError("Metadata strings must be at most 2,000 characters.")
    return value


def node(group, key):
    if not isinstance(group, h5py.Group) or not key or "/" in key or key in (".", ".."):
        raise ValueError("Expected a local AnnData group entry.")
    if not isinstance(group.get(key, getlink=True), h5py.HardLink):
        raise ValueError(f"Missing entry or unsupported external/soft link: {key}.")
    item = group[key]
    if isinstance(item, h5py.Dataset) and (item.is_virtual or item.external):
        raise ValueError("Virtual datasets and external storage are not supported.")
    return item


def array(item, max_values=MAX_VALUES, ndim=1):
    if not isinstance(item, h5py.Dataset) or item.ndim != ndim or item.size > max_values:
        raise ValueError("Array shape exceeds import limits. Export a smaller subset.")
    if item.dtype.kind not in "biuf":
        raise ValueError("Expected a numeric array.")
    values = item[()]
    if not np.isfinite(values).all():
        raise ValueError("Expression and coordinates must contain finite values.")
    return values


def column_length(item):
    if isinstance(item, h5py.Group):
        encoding = label(item.attrs.get("encoding-type", ""))
        if encoding == "categorical":
            item = node(item, "codes")
        elif encoding in ("nullable-integer", "nullable-boolean", "nullable-string-array"):
            item = node(item, "values")
        else:
            raise ValueError(f"Unsupported column encoding: {encoding}.")
    if not isinstance(item, h5py.Dataset) or item.ndim != 1:
        raise ValueError("A one-dimensional metadata column is required.")
    return len(item)


def column(item, length, depth=0):
    if depth > 2:
        raise ValueError("Recursive or deeply nested metadata is not supported.")
    if isinstance(item, h5py.Group):
        encoding = label(item.attrs.get("encoding-type", ""))
        if encoding == "categorical":
            codes = array(node(item, "codes"), MAX_CELLS)
            categories_node = node(item, "categories")
            categories = column(categories_node, column_length(categories_node), depth + 1)
            if codes.dtype.kind not in "iu" or np.any(codes < -1) or np.any(codes >= len(categories)):
                raise ValueError("Invalid categorical metadata codes.")
            values = [None if c == -1 else categories[c] for c in codes]
        elif encoding in ("nullable-integer", "nullable-boolean", "nullable-string-array"):
            values = column(node(item, "values"), length, depth + 1)
            mask = array(node(item, "mask"), MAX_CELLS)
            if len(mask) != length or mask.dtype.kind != "b":
                raise ValueError("Invalid nullable metadata mask.")
            values = [None if missing else value for value, missing in zip(values, mask, strict=True)]
        else:
            raise ValueError(f"Unsupported metadata encoding: {encoding}.")
    elif isinstance(item, h5py.Dataset) and item.ndim == 1 and item.size <= MAX_CELLS:
        if item.dtype.kind in "biuf":
            values = [v.item() if np.isfinite(v) else None for v in item[()]]
        elif h5py.check_string_dtype(item.dtype):
            # Read strings individually so repeated variable-length strings cannot
            # allocate an unbounded array before their lengths are checked.
            values = [label(item[i]) for i in range(len(item))]
        else:
            raise ValueError("Unsupported metadata type; export strings or numeric columns.")
    else:
        raise ValueError("Invalid metadata column shape.")
    if len(values) != length:
        raise ValueError("Metadata column lengths do not match their index.")
    return values


def frame(group, maximum):
    if not isinstance(group, h5py.Group):
        raise ValueError("Legacy compound obs/var tables are unsupported. Rewrite with current AnnData.")
    index_name = label(group.attrs.get("_index", "_index"))
    index_node = node(group, index_name)
    n = column_length(index_node)
    if not 0 < n <= maximum:
        raise ValueError(f"Import supports up to {maximum:,} entries on this axis. Export a subset.")
    ids = column(index_node, n)
    if (
        any(not isinstance(i, str) or not i.strip() or i != i.strip() or len(i) > 500 for i in ids)
        or len(set(ids)) != n
    ):
        raise ValueError("Cell and feature IDs must be unique, nonempty strings without outer whitespace.")
    keys = [label(k) for k in group.attrs.get("column-order", [])]
    if len(keys) > 50 or len(set(keys)) != len(keys) or any(not k or len(k) > 100 for k in keys):
        raise ValueError("Use at most 50 uniquely named metadata columns per axis.")
    columns = {k: column(node(group, k), n) for k in keys}
    return [{"id": id_, "metadata": {k: v[i] for k, v in columns.items()}} for i, id_ in enumerate(ids)]


def expression(item, n, p):
    if isinstance(item, h5py.Dataset):
        if item.shape != (n, p):
            raise ValueError("X must be cells × genes.")
        return {"encoding": "dense", "values": array(item, ndim=2).tolist()}
    if not isinstance(item, h5py.Group):
        raise ValueError("Expected a dense or sparse X matrix.")
    kind = label(item.attrs.get("encoding-type", ""))
    if kind not in ("csr_matrix", "csc_matrix") or tuple(item.attrs.get("shape", ())) != (n, p):
        raise ValueError("X must be a cells × genes CSR/CSC matrix with shape metadata.")
    data = array(node(item, "data"))
    indices = array(node(item, "indices"))
    pointers = array(node(item, "indptr"), max(n, p) + 1)
    major, minor = (n, p) if kind == "csr_matrix" else (p, n)
    if indices.dtype.kind not in "iu" or pointers.dtype.kind not in "iu":
        raise ValueError("Sparse indices and pointers must be integers.")
    if (
        len(pointers) != major + 1
        or pointers[0] != 0
        or pointers[-1] != len(data)
        or len(indices) != len(data)
    ):
        raise ValueError("Sparse array lengths are inconsistent.")
    if (
        np.any(pointers[1:] < pointers[:-1])
        or np.any(pointers > len(data))
        or np.any(indices < 0)
        or np.any(indices >= minor)
    ):
        raise ValueError("Sparse pointers or indices are out of range.")
    if kind == "csc_matrix":
        columns = np.repeat(np.arange(p), np.diff(pointers.astype(np.int64)))
        order = np.argsort(indices, kind="stable")
        pointers = np.concatenate(([0], np.cumsum(np.bincount(indices.astype(np.int64), minlength=n))))
        indices, data = columns[order], data[order]
    for i in range(n):
        row = indices[pointers[i] : pointers[i + 1]]
        if len(np.unique(row)) != len(row):
            raise ValueError("Duplicate sparse coordinates must be resolved before importing.")
    return {
        "encoding": "csr",
        "indptr": pointers.tolist(),
        "indices": indices.tolist(),
        "data": data.tolist(),
    }


def read_h5ad(path: str | Path):
    if Path(path).stat().st_size > MAX_UPLOAD:
        raise ValueError("H5AD import is limited to 32 MiB.")
    with h5py.File(path, "r") as root:
        cells, genes = frame(node(root, "obs"), MAX_CELLS), frame(node(root, "var"), MAX_GENES)
        matrix = expression(node(root, "X"), len(cells), len(genes))
        for cell in cells:
            sample = cell["metadata"].get("sample_id")
            if sample is not None and str(sample).strip():
                if not isinstance(sample, str) or sample != sample.strip() or len(sample) > 500:
                    raise ValueError("sample_id must contain string identifiers without outer whitespace.")
                cell["sampleId"] = sample
        embeddings = {}
        if "obsm" in root:
            obsm = node(root, "obsm")
            for name in ("X_umap", "X_tsne", "X_pca", "spatial"):
                if name not in obsm:
                    continue
                item = node(obsm, name)
                if (
                    not isinstance(item, h5py.Dataset)
                    or item.ndim != 2
                    or item.shape[0] != len(cells)
                    or item.shape[1] < 2
                    or item.size > MAX_VALUES
                    or item.dtype.kind not in "iuf"
                ):
                    raise ValueError(
                        f"{name} needs a bounded dense coordinate array with at least 2 dimensions."
                    )
                coords = item[:, :2]
                if not np.isfinite(coords).all():
                    raise ValueError(f"{name} contains missing or nonfinite coordinates.")
                embeddings[name] = {"axes": [f"{name} 1", f"{name} 2"], "coordinates": coords.tolist()}
    result = {
        "schema": "cell-omics.singlecell/v1",
        "title": "Imported AnnData",
        "cells": cells,
        "genes": genes,
        "matrix": matrix,
        "embeddings": embeddings,
        "measurement": {
            "kind": "unknown",
            "unit": "X values (confirm source units)",
            "processing": (
                "X values preserved. Only first two dimensions of supported embeddings retained. "
                "raw, layers, uns, graphs and other embeddings are not imported. Source SHA256: "
                + hashlib.sha256(Path(path).read_bytes()).hexdigest()
            ),
        },
    }
    if len(json.dumps(result, allow_nan=False).encode()) > MAX_PACKAGE:
        raise ValueError("Converted package exceeds 20 MiB. Export a smaller subset.")
    return result
