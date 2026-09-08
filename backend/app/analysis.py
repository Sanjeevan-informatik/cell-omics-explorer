"""Dependency-light DNA alignment statistics and evolutionary distances."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite, log
from typing import Literal

DistanceModel = Literal["p-distance", "jc69", "k2p"]
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


def pairwise_distance(first: str, second: str, model: DistanceModel = "jc69") -> float | None:
    comparable = differences = transitions = transversions = 0
    for left, right in zip(first, second, strict=True):
        if left not in CANONICAL_BASES or right not in CANONICAL_BASES:
            continue
        comparable += 1
        if left != right:
            differences += 1
            if left + right in TRANSITIONS:
                transitions += 1
            else:
                transversions += 1
    if comparable == 0:
        return None
    observed = differences / comparable
    if model == "p-distance":
        return observed
    if model == "jc69":
        term = 1 - 4 * observed / 3
        return -0.75 * log(term) if term > 0 else None
    transition_rate = transitions / comparable
    transversion_rate = transversions / comparable
    first_term = 1 - 2 * transition_rate - transversion_rate
    second_term = 1 - 2 * transversion_rate
    if first_term <= 0 or second_term <= 0:
        return None
    return -0.5 * log(first_term) - 0.25 * log(second_term)


def distance_matrix(records: list[SequenceRecord], model: DistanceModel) -> list[list[float | None]]:
    size = len(records)
    matrix: list[list[float | None]] = [[0.0 for _ in range(size)] for _ in range(size)]
    for row in range(size):
        for column in range(row + 1, size):
            value = pairwise_distance(records[row].sequence, records[column].sequence, model)
            matrix[row][column] = value
            matrix[column][row] = value
    return matrix


def build_upgma(samples: list[str], matrix: list[list[float | None]]) -> dict:
    clusters = [
        {"members": [index], "node": {"name": sample, "height": 0.0}, "newick": _safe_name(sample)}
        for index, sample in enumerate(samples)
    ]

    def average(left: dict, right: dict) -> float:
        values = [matrix[i][j] for i in left["members"] for j in right["members"] if matrix[i][j] is not None]
        return sum(values) / len(values) if values else float("inf")

    while len(clusters) > 1:
        candidates = [
            (average(clusters[i], clusters[j]), i, j)
            for i in range(len(clusters))
            for j in range(i + 1, len(clusters))
        ]
        distance, left_index, right_index = min(candidates, key=lambda item: item[0])
        left, right = clusters[left_index], clusters[right_index]
        height = (
            distance / 2
            if isfinite(distance)
            else max(left["node"]["height"], right["node"]["height"]) + 0.01
        )
        left_branch = max(0.0, height - left["node"]["height"])
        right_branch = max(0.0, height - right["node"]["height"])
        merged = {
            "members": left["members"] + right["members"],
            "node": {"height": height, "children": [left["node"], right["node"]]},
            "newick": f"({left['newick']}:{left_branch:.5f},{right['newick']}:{right_branch:.5f})",
        }
        clusters = [
            cluster for index, cluster in enumerate(clusters) if index not in {left_index, right_index}
        ]
        clusters.append(merged)
    return {"root": clusters[0]["node"], "newick": clusters[0]["newick"] + ";"}


def _safe_name(name: str) -> str:
    return "".join(character if character.isalnum() or character in "_.-" else "_" for character in name)


def analyze_alignment(fasta: str, model: DistanceModel) -> dict:
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

    matrix = distance_matrix(records, model)
    return {
        "records": [{"id": record.id, "sequence": record.sequence} for record in records],
        "sequenceLength": length,
        "composition": composition,
        "variants": variants,
        "matrix": {"samples": [record.id for record in records], "values": matrix},
        "metrics": {
            "meanGcPercent": sum(row["gcPercent"] for row in composition) / len(composition),
            "ambiguousBases": sum(row["N"] for row in composition),
            "transitions": transitions,
            "transversions": transversions,
            "transitionTransversionRatio": transitions / transversions if transversions else None,
        },
        "tree": build_upgma([record.id for record in records], matrix),
    }
