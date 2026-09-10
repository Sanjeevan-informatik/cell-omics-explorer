# Reproduce the public case study

Use Node.js >=22.13.0. From the repository root run `npm ci`, `npm run typecheck`, `npm test`, and `node research/evaluate-real-data.mjs`.

Run `npm run dev`, open http://localhost:3000/hierarchical-model and click **Load public TCGA data**. The first specimen has three RNA and three protein observations. Select a different participant, then RNA or Proteome; inspect the values, units, provenance and bar chart. Hi-C, sequence, atomic coordinates and time courses are intentionally absent for this public subset. The synthetic examples are a separate dataset.

The bundled subset is under `public/data/tcga-brca/`; `provenance.json` records exact API URLs, SHA-256 hashes, eligibility counts and selection rules. The accompanying preprint reproducibility ZIP contains the original JSON responses, conversion script, complete source, synthetic fixtures and recorded evaluations. API JSON numbers are serialized to TSV without additional numeric rounding or normalization.

Identifiers match the cBioPortal study, patient and sample keys. Participant identifiers are namespaced as study|patient; original identifiers remain in separate fields. Matching does not establish the same aliquot or individual cell. No clinical interpretation is performed.

TCGA and cBioPortal retain attribution and source data terms; see `public/data/tcga-brca/SOURCE_LICENSE.txt`. The software MIT license does not replace upstream data terms. Cite TCGA breast cancer (doi:10.1038/nature11412), the NCI PanCanAtlas data page and cBioPortal (doi:10.1158/2159-8290.CD-12-0095).
