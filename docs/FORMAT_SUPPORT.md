# Format support plan

| Domain | Formats | Prototype | Production route |
|---|---|---|---|
| Genome | FASTA, FASTQ, VCF | preview/demo | browser for small files; backend for scale |
| Alignments | BAM, CRAM, SAM | recognize | htslib/pysam |
| Epigenome | BED, bedGraph, bigWig | concept | pyBigWig/htslib |
| 3D genome | cool, mcool, hic | recognize | cooler/Juicer tooling |
| Transcriptome | GTF/GFF3, counts | demo | pandas/duckdb + interval services |
| Single cell | h5ad, 10x | recognize/demo | AnnData/Scanpy |
| Proteomics | mzML, MSP, FASTA, mzIdentML | teaching parser/view | pyteomics/pymzML/search-engine output |
| Structures | PDB, mmCIF | text/atom demo | Mol*/NGL + Biopython |
| Chemistry | SDF, MOL, SMILES | concept | RDKit service |
| Cytometry | FCS | recognize | FlowKit |
| Imaging | OME-TIFF, OME-Zarr | concept | OME ecosystem |
| Immunomics | AIRR TSV | table demo | AIRR schema validation |
