"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  Atom,
  Dna,
  Fingerprint,
  GalleryVerticalEnd,
  GitBranch,
  Network,
  Orbit,
  ScanSearch,
  Waves,
} from "lucide-react";
import {
  CODONS,
  DNA_30,
  HIERARCHY_GROUPS,
  HIERARCHY_NODES,
  PROTEIN_30,
  PROTEIN_30_RESIDUES,
  RESIDUES_10,
  RNA_30,
  RNA_CODONS,
} from "@/lib/biological-hierarchy";

const BASE_COLORS: Record<string, string> = {
  A: "#33d6a6",
  C: "#4d8dff",
  G: "#f4b942",
  T: "#f06d91",
  U: "#5fe0b6",
  M: "#f4bc72",
  R: "#b18aff",
  L: "#9bd0ff",
  V: "#f1c26c",
  S: "#48c0f5",
  D: "#f07189",
  Q: "#8dcfff",
  P: "#c7a6ff",
};

const GROUP_ICONS = {
  sequence: Dna,
  "small-molecule": Atom,
  regulation: Fingerprint,
  "cell-state": GalleryVerticalEnd,
  systems: Network,
} as const;

const NODE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  dna: Dna,
  "dna-features": ScanSearch,
  rna: Waves,
  protein: Orbit,
  "peptide-ms": GitBranch,
  metabolite: Atom,
  lipid: Atom,
  glycan: Atom,
  epigenome: Fingerprint,
  chromatin: Fingerprint,
  "gene-regulation": ScanSearch,
  "single-cell": GalleryVerticalEnd,
  spatial: GalleryVerticalEnd,
  imaging: GalleryVerticalEnd,
  pathways: Network,
  immunomics: Network,
  evolution: GitBranch,
};

function ProteinRibbon({ selectedResidueIndex }: { selectedResidueIndex: number }) {
  const points = [
    [36, 118], [78, 98], [116, 122], [160, 82], [212, 106], [258, 72], [310, 100], [362, 64], [418, 116], [470, 76], [522, 118],
  ];
  const path = points.map((point, index) => `${index === 0 ? "M" : "C"} ${point[0]} ${point[1]} ${point[0]} ${point[1]} ${point[0]} ${point[1]}`).join(" ");
  return (
    <svg viewBox="0 0 560 180" className="structure-svg" role="img" aria-label="Conceptual protein ribbon">
      <defs>
        <linearGradient id="protein-ribbon-gradient" x1="0" x2="1">
          <stop offset="0%" stopColor="#f4b942" />
          <stop offset="35%" stopColor="#ffb158" />
          <stop offset="60%" stopColor="#84bfff" />
          <stop offset="100%" stopColor="#e4eef9" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#protein-ribbon-gradient)" strokeWidth="18" strokeLinecap="round" opacity="0.95" />
      {PROTEIN_30_RESIDUES.map((residue, index) => {
        const x = 48 + index * 16;
        const y = index < 10 ? 144 : 26;
        const selected = index === selectedResidueIndex;
        return (
          <g key={`${residue}-${index}`}>
            <line x1={x} y1={index < 10 ? 130 : 38} x2={x} y2={index < 10 ? 118 : 54} className="structure-guide" />
            <circle cx={x} cy={index < 10 ? 146 : 24} r={selected ? 13 : 10} fill={selected ? "#ffffff" : "#14263a"} stroke={selected ? "#f4b942" : "#4b6e95"} strokeWidth={selected ? 3 : 1.5} />
            <text x={x} y={index < 10 ? 150 : 28} textAnchor="middle" className={selected ? "structure-text is-selected" : "structure-text"}>{residue}</text>
          </g>
        );
      })}
      <text x="32" y="18" className="structure-caption">Protein 30 residues</text>
      <text x="26" y="164" className="structure-caption">Residues 1–10 derive from the 30 DNA bases</text>
    </svg>
  );
}

function DNAHelix({ selectedPosition }: { selectedPosition: number }) {
  const indices = Array.from({ length: 30 }, (_, index) => index);
  return (
    <svg viewBox="0 0 620 190" className="structure-svg" role="img" aria-label="Conceptual DNA double helix">
      {indices.map((index) => {
        const x = 26 + index * 19;
        const phase = index * 0.46;
        const yTop = 58 + Math.sin(phase) * 24;
        const yBottom = 132 - Math.sin(phase) * 24;
        const selected = index === selectedPosition;
        return (
          <g key={index}>
            <line x1={x} y1={yTop} x2={x} y2={yBottom} className={selected ? "helix-rung is-selected" : "helix-rung"} />
            <circle cx={x} cy={yTop} r={selected ? 8 : 6} fill="#6db1ff" />
            <circle cx={x} cy={yBottom} r={selected ? 8 : 6} fill="#f58aa5" />
            <text x={x} y={168} textAnchor="middle" className={selected ? "structure-text is-selected" : "structure-text"}>{DNA_30[index]}</text>
            <text x={x} y={182} textAnchor="middle" className="structure-axis">{index + 1}</text>
          </g>
        );
      })}
      <path d="M 26 58 C 100 6, 166 110, 242 58 S 384 6, 460 58 S 546 110, 596 58" className="helix-strand-a" />
      <path d="M 26 132 C 100 184, 166 80, 242 132 S 384 184, 460 132 S 546 80, 596 132" className="helix-strand-b" />
      <text x="24" y="20" className="structure-caption">30-base DNA coding sequence</text>
      <text x="24" y="36" className="structure-caption secondary">Selected base maps into codon, RNA, and residue space</text>
    </svg>
  );
}

export function HierarchicalBiologyPanel() {
  const [selectedNodeId, setSelectedNodeId] = useState("dna");
  const [structureMode, setStructureMode] = useState<"2d" | "3d">("2d");
  const [selectedDnaPosition, setSelectedDnaPosition] = useState(0);
  const selectedNode = HIERARCHY_NODES[selectedNodeId];

  const structureContext = useMemo(() => {
    const codonIndex = Math.floor(selectedDnaPosition / 3);
    const residueIndex = Math.min(codonIndex, RESIDUES_10.length - 1);
    const base = DNA_30[selectedDnaPosition];
    const codon = CODONS[codonIndex];
    const rnaCodon = RNA_CODONS[codonIndex];
    const residue = RESIDUES_10[residueIndex];
    return {
      base,
      codon,
      rnaCodon,
      residue,
      codonIndex,
      residueIndex,
      localDna: DNA_30.slice(Math.max(0, selectedDnaPosition - 2), Math.min(DNA_30.length, selectedDnaPosition + 3)),
      proteinContext: PROTEIN_30,
    };
  }, [selectedDnaPosition]);

  return (
    <div className="hierarchy-panel">
      <section className="visual-card full-card hierarchy-hero">
        <div className="card-heading">
          <div>
            <h3>Hierarchical biological model</h3>
            <p>Group connected data together: DNA, DNA features, RNA, protein, and peptide/MS form the main sequence-centric layer, while lipids, metabolites, and glycans are separated as small-molecule data.</p>
          </div>
          <span>Organized by function</span>
        </div>
        <div className="hierarchy-groups">
          {HIERARCHY_GROUPS.map((group) => {
            const Icon = GROUP_ICONS[group.id as keyof typeof GROUP_ICONS];
            return (
              <article key={group.id} className="hierarchy-group-card">
                <header>
                  <div className="hierarchy-group-title"><span className="hierarchy-group-icon"><Icon /></span><div><h4>{group.title}</h4><p>{group.subtitle}</p></div></div>
                </header>
                <div className="hierarchy-node-grid">
                  {group.nodes.map((nodeId) => {
                    const node = HIERARCHY_NODES[nodeId];
                    const NodeIcon = NODE_ICONS[nodeId] ?? Atom;
                    return (
                      <button
                        type="button"
                        key={node.id}
                        className={`hierarchy-node-button ${selectedNodeId === node.id ? "is-selected" : ""}`}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <span className="hierarchy-node-icon"><NodeIcon /></span>
                        <strong>{node.label}</strong>
                        <small>{node.subtitle}</small>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="hierarchy-detail-grid">
        <article className="visual-card hierarchy-node-detail">
          <div className="card-heading">
            <div>
              <h3>{selectedNode.label}</h3>
              <p>{selectedNode.subtitle}</p>
            </div>
            <span>{selectedNode.group.replace(/-/g, " ")}</span>
          </div>
          <p className="hierarchy-node-description">{selectedNode.description}</p>
          <div className="hierarchy-detail-columns">
            <div>
              <h4>Details</h4>
              <ul>
                {selectedNode.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </div>
            <div>
              <h4>2D structures</h4>
              <ul>
                {selectedNode.structure2d.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </div>
            <div>
              <h4>3D structures</h4>
              <ul>
                {selectedNode.structure3d.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </div>
          </div>
        </article>

        <article className="visual-card hierarchy-node-detail info-callout">
          <div className="card-heading">
            <div>
              <h3>Why separate these panels?</h3>
              <p>Sequence-centric and small-molecule layers behave differently.</p>
            </div>
            <span>Design logic</span>
          </div>
          <ul className="callout-list">
            <li><strong>Keep together:</strong> DNA, DNA features, RNA, protein, and peptide/MS because they directly map from sequence to function.</li>
            <li><strong>Separate:</strong> metabolite, lipid, and glycan because they are chemically important but not arranged as a simple linear central-dogma chain.</li>
            <li><strong>Supportive context:</strong> epigenome, chromatin, imaging, pathways, immunomics, and phylogeny remain available as adjacent functional panels.</li>
          </ul>
        </article>
      </section>

      <section className="visual-card full-card sequence-structure-card">
        <div className="card-heading">
          <div>
            <h3>Combined DNA → RNA → protein structure view</h3>
            <p>A 30-base DNA example is linked to a 30-residue protein context. Click any DNA base to see its codon, RNA codon, residue, and structure.</p>
          </div>
          <div className="mode-pill-row" role="group" aria-label="Structure mode">
            <button type="button" className={structureMode === "2d" ? "is-active" : ""} onClick={() => setStructureMode("2d")}>2D</button>
            <button type="button" className={structureMode === "3d" ? "is-active" : ""} onClick={() => setStructureMode("3d")}>3D</button>
          </div>
        </div>

        <div className="structure-summary-grid">
          <div><span>Selected base</span><strong>{structureContext.base} · position {selectedDnaPosition + 1}</strong></div>
          <div><span>DNA codon</span><strong>{structureContext.codon} · codon {structureContext.codonIndex + 1}</strong></div>
          <div><span>RNA codon</span><strong>{structureContext.rnaCodon}</strong></div>
          <div><span>Protein residue</span><strong>{structureContext.residue} · residue {structureContext.residueIndex + 1}</strong></div>
        </div>

        <div className="dna-selector-grid" aria-label="DNA positions 1 to 30">
          {DNA_30.split("").map((base, index) => (
            <button
              type="button"
              key={`${base}-${index}`}
              className={`dna-base-button ${index === selectedDnaPosition ? "is-selected" : ""}`}
              onClick={() => setSelectedDnaPosition(index)}
              style={{ color: BASE_COLORS[base] ?? "#dfe8f7" }}
              title={`DNA position ${index + 1}: ${base}`}
            >
              <span>{index + 1}</span>
              <strong>{base}</strong>
            </button>
          ))}
        </div>

        {structureMode === "2d" ? (
          <div className="structure-2d-layout">
            <div className="structure-flow-panel">
              <div className="track-row"><span>DNA 1–30</span><div className="track-sequence">{DNA_30.split("").map((base, index) => <button key={`dna-${index}`} type="button" className={`track-token ${index === selectedDnaPosition ? "is-selected" : ""}`} onClick={() => setSelectedDnaPosition(index)}>{base}</button>)}</div></div>
              <div className="track-row"><span>Codons</span><div className="track-sequence codon-track">{CODONS.map((codon, index) => <div key={codon + index} className={`track-token wide ${index === structureContext.codonIndex ? "is-selected" : ""}`}>{codon}</div>)}</div></div>
              <div className="track-row"><span>RNA</span><div className="track-sequence">{RNA_30.split("").map((base, index) => <div key={`rna-${index}`} className={`track-token is-rna ${Math.floor(index / 3) === structureContext.codonIndex ? "is-selected" : ""}`}>{base}</div>)}</div></div>
              <div className="track-row"><span>Residues 1–10</span><div className="track-sequence codon-track">{RESIDUES_10.map((residue, index) => <div key={residue + index} className={`track-token is-aa wide ${index === structureContext.residueIndex ? "is-selected" : ""}`}>{residue}</div>)}</div></div>
              <div className="track-row"><span>Protein 1–30</span><div className="track-sequence">{PROTEIN_30_RESIDUES.map((residue, index) => <div key={residue + index} className={`track-token is-protein ${index === structureContext.residueIndex ? "is-selected" : index < 10 ? "is-derived" : ""}`}>{residue}</div>)}</div></div>
            </div>
            <div className="structure-detail-panel">
              <div className="structure-note-card">
                <h4>Selected interpretation</h4>
                <p>DNA position <strong>{selectedDnaPosition + 1}</strong> contains <strong>{structureContext.base}</strong>. It belongs to codon <strong>{structureContext.codon}</strong>, produces RNA codon <strong>{structureContext.rnaCodon}</strong>, and maps to protein residue <strong>{structureContext.residue}{structureContext.residueIndex + 1}</strong>.</p>
              </div>
              <div className="structure-note-card">
                <h4>2D structure ideas</h4>
                <ul>
                  <li>DNA base chemistry and base-pair view</li>
                  <li>Codon triplet and translated amino-acid mapping</li>
                  <li>Protein 30-residue linear context with highlighted translated window</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="structure-3d-layout">
            <div className="structure-visual-stack">
              <DNAHelix selectedPosition={selectedDnaPosition} />
              <ProteinRibbon selectedResidueIndex={structureContext.residueIndex} />
            </div>
            <div className="structure-detail-panel">
              <div className="structure-note-card">
                <h4>3D interpretation</h4>
                <p>The selected base is highlighted in a conceptual double helix, and the mapped protein residue is highlighted within a conceptual 30-residue ribbon model.</p>
              </div>
              <div className="structure-note-card">
                <h4>Combined structural context</h4>
                <ul>
                  <li><strong>DNA:</strong> 30 coding nucleotides shown as a local helix section</li>
                  <li><strong>Protein:</strong> 30-residue context with residues 1–10 derived from the 30 DNA bases</li>
                  <li><strong>Bridge:</strong> codon {structureContext.codonIndex + 1} → residue {structureContext.residueIndex + 1}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
