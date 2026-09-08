import math

import pytest

from app.analysis import analyze_alignment, pairwise_distance, parse_fasta

SAMPLE = ">reference\nACGTACGT\n>sample_b\nACGTGCGT\n>sample_c\nACGTACGA\n"


def test_parse_fasta_reads_aligned_records():
    records = parse_fasta(SAMPLE)
    assert [record.id for record in records] == ["reference", "sample_b", "sample_c"]
    assert all(len(record.sequence) == 8 for record in records)


def test_parse_fasta_rejects_unequal_lengths():
    with pytest.raises(ValueError, match="same length"):
        parse_fasta(">a\nACGT\n>b\nACG\n")


def test_jc69_matches_closed_form():
    observed = 1 / 8
    expected = -0.75 * math.log(1 - 4 * observed / 3)
    assert pairwise_distance("ACGTACGT", "ACGTGCGT", "jc69") == pytest.approx(expected)


def test_k2p_separates_transition_and_transversion_rates():
    distance = pairwise_distance("AAAAACCC", "GAAAAGCC", "k2p")
    expected = -0.5 * math.log(1 - 2 * (1 / 8) - 1 / 8) - 0.25 * math.log(1 - 2 * (1 / 8))
    assert distance == pytest.approx(expected)


def test_analysis_returns_variants_symmetric_matrix_and_tree():
    result = analyze_alignment(SAMPLE, "jc69")
    assert result["sequenceLength"] == 8
    assert [site["position"] for site in result["variants"]] == [5, 8]
    assert result["matrix"]["values"][0][1] == result["matrix"]["values"][1][0]
    assert result["tree"]["newick"].endswith(";")
