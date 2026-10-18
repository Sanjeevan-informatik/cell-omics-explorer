"""Dependency-light DNA alignment statistics and variable-site inspection."""

from __future__ import annotations

from dataclasses import dataclass

VALID_BASES = frozenset("ACGTN-?")
CANONICAL_BASES = frozenset("ACGT")
TRANSITIONS = frozenset({"AG", "GA", "CT", "TC"})


@dataclass(frozen=True)
class SequenceRecord:
    id: str
    sequence: str


def parse_fasta(text: str) -> list[SequenceRecord]:
    records: list[SequenceRecord] = []
    current_id: str | None = None
    sequence_parts: list[str] = []

    def append_current() -> None:
        if current_id is None:
            return
        sequence = "".join(sequence_parts).upper()
        if not sequence:
            raise ValueError(f"Sample '{current_id}' has no sequence")
        records.append(SequenceRecord(current_id, sequence))

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(">"):
            append_current()
            current_id = line[1:].strip().split()[0] if line[1:].strip() else None
            if current_id is None:
                raise ValueError("Every FASTA header needs a sample name")
            if any(record.id == current_id for record in records):
                raise ValueError(f"Duplicate sample name: {current_id}")
            sequence_parts = []
        else:
            if current_id is None:
                raise ValueError("FASTA data must begin with a >sample header")
            sequence_parts.append("".join(line.split()))
    append_current()

    if len(records) < 2:
        raise ValueError("Add at least two DNA sequences")
    length = len(records[0].sequence)
    if any(len(record.sequence) != length for record in records):
        raise ValueError("Sequences must be aligned and have the same length")
    invalid = sorted({base for record in records for base in record.sequence if base not in VALID_BASES})
    if invalid:
        raise ValueError(f"Unsupported DNA symbols: {', '.join(invalid)}")
    if len(records) > 50 or length > 20_000:
        raise ValueError("This service accepts up to 50 sequences × 20,000 bases")
    return records


def analyze_alignment(fasta: str) -> dict:
    records = parse_fasta(fasta)
    length = len(records[0].sequence)
    composition = []
    for record in records:
        counts = {base: record.sequence.count(base) for base in "ACGT"}
        counts["N"] = length - sum(counts.values())
        canonical = sum(counts[base] for base in "ACGT")
        composition.append(
            {
                "id": record.id,
                **counts,
                "gcPercent": 100 * (counts["G"] + counts["C"]) / canonical if canonical else 0.0,
            }
        )

    reference = records[0].sequence
    variants = []
    transitions = transversions = 0
    for index in range(length):
        counts: dict[str, int] = {}
        for record in records:
            base = record.sequence[index]
            counts[base] = counts.get(base, 0) + 1
        canonical = [base for base in counts if base in CANONICAL_BASES]
        if len(canonical) > 1:
            alternates = [base for base in canonical if base != reference[index]]
            variants.append(
                {
                    "position": index + 1,
                    "reference": reference[index],
                    "alternates": alternates,
                    "counts": counts,
                }
            )
            for alternate in alternates:
                if reference[index] + alternate in TRANSITIONS:
                    transitions += counts[alternate]
                else:
                    transversions += counts[alternate]

    return {
        "records": [{"id": record.id, "sequence": record.sequence} for record in records],
        "sequenceLength": length,
        "composition": composition,
        "variants": variants,
        "metrics": {
            "meanGcPercent": sum(row["gcPercent"] for row in composition) / len(composition),
            "ambiguousBases": sum(row["N"] for row in composition),
            "transitions": transitions,
            "transversions": transversions,
            "transitionTransversionRatio": transitions / transversions if transversions else None,
        },
    }
