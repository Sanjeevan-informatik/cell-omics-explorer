"""Reproduce the small public PBMC package from a checksum-pinned Scanpy source.

Run with backend dependencies installed:
  python scripts/prepare-pbmc.py /path/to/pbmc3k.h5ad
The source URL is in SOURCE below. No network access is performed by this script.
"""
import hashlib
import json
import sys
from pathlib import Path

import h5py

SOURCE = "https://raw.githubusercontent.com/chanzuckerberg/cellxgene/main/example-dataset/pbmc3k.h5ad"
SHA256 = "0db367b991dd95809732b218539ede489bea99113807f62ebd7ccc970025fe38"
GENES = ["CD3D", "IL7R", "MS4A1", "CD79A", "CD14", "LYZ", "FCGR3A", "MS4A7", "NKG7", "GNLY", "FCER1A", "CST3", "PPBP", "PF4", "HLA-DRA", "LST1"]


def prepare(source, output):
    if hashlib.sha256(source.read_bytes()).hexdigest() != SHA256:
        raise ValueError("Source checksum differs from the pinned Scanpy dataset.")
    with h5py.File(source, "r") as f:
        obs, features, coords = f["obs"][()], f["raw.var"][()], f["obsm"][()]
        labels = [v.decode() for v in f["uns/louvain_categories"][()]]
        gene_ids = [row["index"].decode() for row in features]
        selection = {gene_ids.index(g): i for i, g in enumerate(GENES)}
        x = f["raw.X"]
        ptr, indices, values = x["indptr"][()], x["indices"][()], x["data"][()]
        matrix = {"encoding": "csr", "indptr": [0], "indices": [], "data": []}
        for i in range(len(obs)):
            for j in range(ptr[i], ptr[i + 1]):
                if indices[j] in selection:
                    matrix["indices"].append(selection[indices[j]])
                    matrix["data"].append(float(values[j]))
            matrix["indptr"].append(len(matrix["data"]))
        package = {
            "schema": "cell-omics.singlecell/v1",
            "title": "PBMC3k · 2,638 cells / 16 selected markers",
            "cells": [{"id": row["index"].decode(), "sampleId": "pbmc3k", "metadata": {
                "cell_type": labels[row["louvain"]], "n_genes": int(row["n_genes"]),
                "n_counts": float(row["n_counts"]), "mitochondrial_fraction": float(row["percent_mito"]),
            }} for row in obs],
            "genes": [{"id": g, "symbol": g, "metadata": {"n_cells_in_source": int(features[gene_ids.index(g)]["n_cells"])}} for g in GENES],
            "matrix": matrix,
            "measurement": {"kind": "normalized", "unit": "source raw.X log-expression", "processing": "Sixteen marker columns extracted from the source raw.X (log-transformed processed expression, not raw UMI counts). All 2,638 source cells retained. Values and supplied UMAP/t-SNE coordinates preserved without rounding, re-normalization, or recomputation. Source n_counts and n_genes describe the full source assay, not this marker subset."},
            "embeddings": {k: {"axes": [k + " 1", k + " 2"], "coordinates": coords[k].tolist()} for k in ["X_umap", "X_tsne"]},
            "provenance": {"citation": "10x Genomics, 3k PBMCs from a Healthy Donor (2016); processed PBMC3k distributed by Scanpy and cellxgene.", "url": "https://www.10xgenomics.com/datasets/3-k-pbm-cs-from-a-healthy-donor-1-standard-1-1-0", "license": "CC BY 4.0 (10x Genomics source data)", "sha256": SHA256, "notes": "Source: " + SOURCE + ". Source file is the Scanpy pbmc3k_processed example. Labels are the source's annotated Louvain groups, not new cell-type predictions. One donor and one sample; selected markers are for software demonstration and are not a complete transcriptome. The local sample identifier pbmc3k identifies this source sample; no donor identity is supplied."},
        }
    output.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(package, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
    (output / "pbmc3k.cellomics.json").write_text(payload)
    (output / "SHA256SUMS").write_text(hashlib.sha256(payload.encode()).hexdigest() + "  pbmc3k.cellomics.json\n")
    print(f"Wrote {len(obs)} cells, {len(GENES)} genes, {len(matrix['data'])} stored values, {len(payload.encode())} bytes")


if __name__ == "__main__":
    prepare(Path(sys.argv[1]), Path(__file__).resolve().parents[1] / "public/data/pbmc3k")
