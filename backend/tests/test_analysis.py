import pytest

from app.analysis import analyze_alignment, parse_fasta

SAMPLE = ">reference\nACGTACGT\n>sample_b\nACGTGCGT\n>sample_c\nACGTACGA\n"


def test_parse_fasta_reads_aligned_records():
    records = parse_fasta(SAMPLE)
    assert [record.id for record in records] == ["reference", "sample_b", "sample_c"]
    assert all(len(record.sequence) == 8 for record in records)


def test_parse_fasta_rejects_unequal_lengths():
    with pytest.raises(ValueError, match="same length"):
        parse_fasta(">a\nACGT\n>b\nACG\n")


def test_analysis_returns_alignment_composition_and_variants():
    result = analyze_alignment(SAMPLE)
    assert result["sequenceLength"] == 8
    assert [site["position"] for site in result["variants"]] == [5, 8]
    assert set(result) == {"records", "sequenceLength", "composition", "variants", "metrics"}
    assert result["composition"][0]["gcPercent"] == 50.0
    assert result["variants"][0]["counts"] == {"A": 2, "G": 1}
