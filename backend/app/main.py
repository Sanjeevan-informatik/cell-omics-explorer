import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .analysis import analyze_alignment
from .models import AnalysisRequest

app = FastAPI(
    title="CellOmics API",
    version="1.0.0",
    description="Validated DNA alignment statistics, evolutionary distances, and UPGMA trees.",
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
        return analyze_alignment(request.fasta, request.model)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
