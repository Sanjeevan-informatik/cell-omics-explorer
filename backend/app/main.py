import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from .analysis import analyze_alignment
from .models import AnalysisRequest
from .single_cell import MAX_UPLOAD, read_h5ad

app = FastAPI(
    title="CellOmics API",
    version="1.0.0",
    description="Validated DNA alignment statistics, base composition, and variable-site inspection.",
)

origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:4173").split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "genomevista-api"}


@app.post("/api/v1/analyze", tags=["analysis"])
def analyze(request: AnalysisRequest) -> dict:
    try:
        return analyze_alignment(request.fasta)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/v1/import/h5ad", tags=["data import"])
async def import_h5ad(request: Request) -> dict:
    """Read a small H5AD sent as application/octet-stream; delete the temp file."""
    if request.headers.get("content-type", "").split(";")[0] != "application/octet-stream":
        raise HTTPException(status_code=415, detail="Send the H5AD as application/octet-stream.")
    with tempfile.TemporaryDirectory(prefix="cellomics-") as directory:
        path = Path(directory) / "input.h5ad"
        with path.open("wb") as upload:
            total = 0
            async for chunk in request.stream():
                total += len(chunk)
                if total > MAX_UPLOAD:
                    raise HTTPException(status_code=413, detail="H5AD import is limited to 32 MiB.")
                upload.write(chunk)
        try:
            return await run_in_threadpool(read_h5ad, path)
        except (ValueError, OSError, KeyError, TypeError, UnicodeError) as error:
            raise HTTPException(status_code=422, detail=f"Cannot import H5AD: {error}") from error
