from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    fasta: str = Field(
        min_length=1, max_length=2_000_000, description="Aligned DNA sequences in FASTA format"
    )
