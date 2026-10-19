import h5py
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.single_cell import read_h5ad


def fixture(path, encoding="dense"):
    with h5py.File(path, "w") as f:
        for axis, ids in [("obs", ["C1", "C2"]), ("var", ["G1", "G2", "G3"])]:
            g = f.create_group(axis)
            g.attrs["_index"] = "_index"
            g.attrs["column-order"] = ["cluster", "sample_id"] if axis == "obs" else []
            g.create_dataset("_index", data=np.array(ids, dtype="S2"))
        obs = f["obs"]
        obs.create_dataset("sample_id", data=np.array(["S1", "S2"], dtype="S2"))
        cluster = obs.create_group("cluster")
        cluster.attrs["encoding-type"] = "categorical"
        cluster.create_dataset("codes", data=[-1, 1])
        cluster.create_dataset("categories", data=np.array(["T", "B"], dtype="S1"))
        if encoding == "dense":
            f.create_dataset("X", data=[[1.0, 0.0, 2.0], [0.0, 3.0, 0.0]])
        else:
            x = f.create_group("X")
            x.attrs["encoding-type"] = encoding + "_matrix"
            x.attrs["shape"] = [2, 3]
            x.create_dataset("indptr", data=[0, 2, 3] if encoding == "csr" else [0, 1, 2, 3])
            x.create_dataset("indices", data=[0, 2, 1] if encoding == "csr" else [0, 1, 0])
            x.create_dataset("data", data=[1.0, 2.0, 3.0] if encoding == "csr" else [1.0, 3.0, 2.0])
        f.create_group("obsm").create_dataset("X_umap", data=[[0.0, 1.0], [2.0, 3.0]])
    return path


@pytest.mark.parametrize("encoding", ["dense", "csr", "csc"])
def test_reads_dense_and_both_sparse_orientations(tmp_path, encoding):
    d = read_h5ad(fixture(tmp_path / "test.h5ad", encoding))
    assert d["cells"][0]["metadata"]["cluster"] is None
    assert d["cells"][1]["metadata"]["cluster"] == "B"
    assert d["cells"][1]["sampleId"] == "S2"
    assert d["embeddings"]["X_umap"]["coordinates"] == [[0, 1], [2, 3]]
    m = d["matrix"]
    if m["encoding"] == "dense":
        assert m["values"] == [[1, 0, 2], [0, 3, 0]]
    else:
        assert m == {"encoding": "csr", "indptr": [0, 2, 3], "indices": [0, 2, 1], "data": [1, 2, 3]}
    assert d["measurement"]["kind"] == "unknown"


@pytest.mark.parametrize("problem", ["duplicate", "pointer", "index", "nonfinite", "embedding", "categories"])
def test_rejects_inconsistent_data(tmp_path, problem):
    path = fixture(tmp_path / "test.h5ad", "csr")
    with h5py.File(path, "a") as f:
        if problem == "duplicate":
            f["obs/_index"][1] = b"C1"
        elif problem == "pointer":
            f["X/indptr"][1] = 4
        elif problem == "index":
            f["X/indices"][0] = 99
        elif problem == "nonfinite":
            f["X/data"][0] = np.nan
        elif problem == "embedding":
            f["obsm/X_umap"][0, 0] = np.nan
        else:
            f["obs/cluster/codes"][0] = 2
    with pytest.raises(ValueError):
        read_h5ad(path)


def test_external_links_are_rejected_without_reading_target(tmp_path):
    path = fixture(tmp_path / "test.h5ad")
    with h5py.File(path, "a") as f:
        del f["X"]
        f["X"] = h5py.ExternalLink("unavailable-private-file.h5", "X")
    with pytest.raises(ValueError, match="external/soft"):
        read_h5ad(path)


def test_oversized_compressed_matrix_is_rejected_before_allocation(tmp_path):
    path = fixture(tmp_path / "test.h5ad")
    with h5py.File(path, "a") as f:
        for axis, size in [("obs", 1000), ("var", 1001)]:
            del f[axis]
            g = f.create_group(axis)
            g.attrs["_index"] = "_index"
            g.attrs["column-order"] = []
            g.create_dataset("_index", data=np.array([f"id{i}" for i in range(size)], dtype="S8"))
        del f["X"]
        f.create_dataset("X", shape=(1000, 1001), dtype="f8", compression="gzip", fillvalue=0)
    with pytest.raises(ValueError, match="limits"):
        read_h5ad(path)


def test_api_import_and_invalid_body(tmp_path):
    client = TestClient(app)
    data = fixture(tmp_path / "test.h5ad").read_bytes()
    result = client.post(
        "/api/v1/import/h5ad", content=data, headers={"Content-Type": "application/octet-stream"}
    )
    assert result.status_code == 200
    assert len(result.json()["cells"]) == 2
    assert (
        client.post(
            "/api/v1/import/h5ad", content=b"bad", headers={"Content-Type": "application/octet-stream"}
        ).status_code
        == 422
    )
    assert client.post("/api/v1/import/h5ad", json={}).status_code == 415


def test_api_enforces_upload_bytes(monkeypatch):
    monkeypatch.setattr("app.main.MAX_UPLOAD", 2)
    assert (
        TestClient(app)
        .post("/api/v1/import/h5ad", content=b"123", headers={"Content-Type": "application/octet-stream"})
        .status_code
        == 413
    )


def test_upstream_anndata_writer_is_compatible(tmp_path):
    import anndata
    import pandas as pd
    from scipy.sparse import csc_matrix

    obs = pd.DataFrame(
        {
            "sample_id": ["S1", "S1"],
            "cluster": pd.Categorical(["T", None]),
            "count": pd.array([2, None], dtype="Int64"),
        },
        index=["C1", "C2"],
    )
    a = anndata.AnnData(
        csc_matrix([[1.0, 0.0, 2.0], [0.0, 3.0, 0.0]]), obs=obs, var=pd.DataFrame(index=["G1", "G2", "G3"])
    )
    a.obsm["X_umap"] = np.array([[0.0, 1.0], [2.0, 3.0]])
    path = tmp_path / "upstream.h5ad"
    a.write_h5ad(path)
    d = read_h5ad(path)
    assert d["cells"][0]["metadata"]["count"] == 2
    assert d["cells"][1]["metadata"]["count"] is None
    assert d["cells"][1]["metadata"]["cluster"] is None
    assert d["matrix"]["data"] == [1, 2, 3]
