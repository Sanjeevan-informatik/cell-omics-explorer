"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

export type NucleotideDisplayMode = "letters" | "2d" | "3d";

type ElementSymbol = "C" | "N" | "O";
type Atom = { element: ElementSymbol; x: number; y: number; z: number };
type Bond = { from: number; to: number; order?: 1 | 2 };
type NucleobaseCompound = {
  symbol: "A" | "C" | "G" | "T" | "U";
  name: string;
  formula: string;
  mass: string;
  family: "Purine" | "Pyrimidine";
  partner: string;
  cid: string;
  smiles: string;
  atoms: Atom[];
  bonds: Bond[];
};

const PURINE_CORE: Atom[] = [
  { element: "N", x: -1.35, y: 0.45, z: 0.05 },
  { element: "C", x: -1.35, y: -0.75, z: -0.04 },
  { element: "N", x: -0.2, y: -1.15, z: 0.04 },
  { element: "C", x: 0.55, y: -0.15, z: 0 },
  { element: "C", x: 1.85, y: -0.2, z: -0.04 },
  { element: "N", x: 2.45, y: 0.9, z: 0.05 },
  { element: "C", x: 1.78, y: 1.95, z: -0.03 },
  { element: "N", x: 0.55, y: 1.62, z: 0.04 },
  { element: "C", x: 0, y: 0.55, z: -0.02 },
];

const PURINE_BONDS: Bond[] = [
  { from: 0, to: 1 }, { from: 1, to: 2, order: 2 }, { from: 2, to: 3 },
  { from: 3, to: 4 }, { from: 4, to: 5, order: 2 }, { from: 5, to: 6 },
  { from: 6, to: 7, order: 2 }, { from: 7, to: 8 }, { from: 8, to: 0 },
  { from: 8, to: 3, order: 2 },
];

const PYRIMIDINE_CORE: Atom[] = [
  { element: "N", x: -1.2, y: 0.6, z: 0.04 },
  { element: "C", x: -0.6, y: -0.6, z: -0.04 },
  { element: "N", x: 0.75, y: -0.65, z: 0.04 },
  { element: "C", x: 1.45, y: 0.5, z: -0.03 },
  { element: "C", x: 0.75, y: 1.7, z: 0.04 },
  { element: "C", x: -0.6, y: 1.75, z: -0.03 },
];

const CYTOSINE_BONDS: Bond[] = [
  { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, order: 2 },
  { from: 3, to: 4 }, { from: 4, to: 5, order: 2 }, { from: 5, to: 0 },
];

const THYMINE_BONDS: Bond[] = [
  { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
  { from: 3, to: 4 }, { from: 4, to: 5, order: 2 }, { from: 5, to: 0 },
];

const GUANINE_CORE_BONDS: Bond[] = [
  { from: 0, to: 1 }, { from: 1, to: 2, order: 2 }, { from: 2, to: 3 },
  { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
  { from: 6, to: 7, order: 2 }, { from: 7, to: 8 }, { from: 8, to: 0 },
  { from: 8, to: 3, order: 2 },
];

export const NUCLEOBASES: Record<"A" | "C" | "G" | "T", NucleobaseCompound> = {
  A: {
    symbol: "A", name: "Adenine", formula: "C₅H₅N₅", mass: "135.13 g/mol", family: "Purine",
    partner: "Thymine (T)", cid: "190", smiles: "C1=NC2=NC=NC(=C2N1)N",
    atoms: [...PURINE_CORE, { element: "N", x: 2.45, y: -1.25, z: 0.06 }],
    bonds: [...PURINE_BONDS, { from: 4, to: 9 }],
  },
  C: {
    symbol: "C", name: "Cytosine", formula: "C₄H₅N₃O", mass: "111.10 g/mol", family: "Pyrimidine",
    partner: "Guanine (G)", cid: "597", smiles: "C1=C(NC(=O)N=C1)N",
    atoms: [
      ...PYRIMIDINE_CORE,
      { element: "O", x: -1.35, y: -1.65, z: 0.06 },
      { element: "N", x: 2.8, y: 0.45, z: -0.05 },
    ],
    bonds: [...CYTOSINE_BONDS, { from: 1, to: 6, order: 2 }, { from: 3, to: 7 }],
  },
  G: {
    symbol: "G", name: "Guanine", formula: "C₅H₅N₅O", mass: "151.13 g/mol", family: "Purine",
    partner: "Cytosine (C)", cid: "135398634", smiles: "NC1=NC(=O)C2=C(N1)N=CN2",
    atoms: [
      ...PURINE_CORE,
      { element: "O", x: 2.45, y: -1.25, z: 0.06 },
      { element: "N", x: 2.35, y: 3.05, z: -0.05 },
    ],
    bonds: [...GUANINE_CORE_BONDS, { from: 4, to: 9, order: 2 }, { from: 6, to: 10 }],
  },
  T: {
    symbol: "T", name: "Thymine", formula: "C₅H₆N₂O₂", mass: "126.11 g/mol", family: "Pyrimidine",
    partner: "Adenine (A)", cid: "1135", smiles: "CC1=CNC(=O)NC1=O",
    atoms: [
      ...PYRIMIDINE_CORE,
      { element: "O", x: -1.35, y: -1.65, z: 0.06 },
      { element: "O", x: 2.8, y: 0.45, z: -0.05 },
      { element: "C", x: 1.35, y: 2.9, z: 0.08 },
    ],
    bonds: [...THYMINE_BONDS, { from: 1, to: 6, order: 2 }, { from: 3, to: 7, order: 2 }, { from: 4, to: 8 }],
  },
};

export const URACIL: NucleobaseCompound = {
  symbol: "U", name: "Uracil", formula: "C₄H₄N₂O₂", mass: "112.09 g/mol", family: "Pyrimidine",
  partner: "Adenine (A)", cid: "1174", smiles: "O=C1NC=CC(=O)N1",
  atoms: [...PYRIMIDINE_CORE, {element:"O",x:-1.35,y:-1.65,z:0.06}, {element:"O",x:2.8,y:0.45,z:-0.05}],
  bonds: [...THYMINE_BONDS, {from:1,to:6,order:2}, {from:3,to:7,order:2}],
};

const ELEMENT_COLORS: Record<ElementSymbol, string> = {
  C: "#8494a1",
  N: "#4d8dff",
  O: "#f06d91",
};

function compoundFor(base: string) {
  return base === "U" ? URACIL : NUCLEOBASES[base as keyof typeof NUCLEOBASES];
}

function boundsFor(atoms: Atom[]) {
  const xs = atoms.map((atom) => atom.x);
  const ys = atoms.map((atom) => atom.y);
  return {
    minX: Math.min(...xs) - 0.65,
    minY: Math.min(...ys) - 0.65,
    width: Math.max(...xs) - Math.min(...xs) + 1.3,
    height: Math.max(...ys) - Math.min(...ys) + 1.3,
  };
}

function BondLines({ bond, atoms, compact = false }: { bond: Bond; atoms: Atom[]; compact?: boolean }) {
  const first = atoms[bond.from];
  const second = atoms[bond.to];
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offsetX = (-dy / length) * (compact ? 0.055 : 0.075);
  const offsetY = (dx / length) * (compact ? 0.055 : 0.075);
  const offsets = bond.order === 2 ? [-1, 1] : [0];
  return offsets.map((offset) => (
    <line
      key={offset}
      x1={first.x + offsetX * offset}
      y1={first.y + offsetY * offset}
      x2={second.x + offsetX * offset}
      y2={second.y + offsetY * offset}
    />
  ));
}

export function BaseStructureGlyph({ base, mode }: { base: string; mode: Exclude<NucleotideDisplayMode, "letters"> }) {
  const compound = compoundFor(base);
  if (!compound) return <span className="unknown-base-glyph">{base}</span>;
  const bounds = boundsFor(compound.atoms);
  return (
    <svg
      className={`base-structure-glyph mode-${mode}`}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      aria-hidden="true"
    >
      <g className="glyph-bonds">{compound.bonds.map((bond, index) => <BondLines key={index} bond={bond} atoms={compound.atoms} compact />)}</g>
      <g>{compound.atoms.map((atom, index) => (
        <circle
          key={index}
          cx={atom.x + (mode === "3d" ? atom.z * 1.8 : 0)}
          cy={atom.y - (mode === "3d" ? atom.z : 0)}
          r={mode === "3d" ? 0.19 + (atom.z + 0.06) * 0.22 : 0.11}
          fill={ELEMENT_COLORS[atom.element]}
        />
      ))}</g>
    </svg>
  );
}

function Structure2D({ compound }: { compound: NucleobaseCompound }) {
  const bounds = boundsFor(compound.atoms);
  return (
    <svg className="compound-structure-2d" viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`} role="img" aria-label={`2D heavy-atom structure of ${compound.name}`}>
      <g className="compound-bonds">{compound.bonds.map((bond, index) => <BondLines key={index} bond={bond} atoms={compound.atoms} />)}</g>
      {compound.atoms.map((atom, index) => (
        <g key={index} className="compound-atom">
          <circle cx={atom.x} cy={atom.y} r="0.24" fill={ELEMENT_COLORS[atom.element]} />
          <text x={atom.x} y={atom.y + 0.08}>{atom.element}</text>
        </g>
      ))}
    </svg>
  );
}

function rotateAtom(atom: Atom, rotationX: number, rotationY: number) {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const x1 = atom.x * cosY + atom.z * sinY;
  const z1 = -atom.x * sinY + atom.z * cosY;
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  return {
    ...atom,
    x: x1,
    y: atom.y * cosX - z1 * sinX,
    z: atom.y * sinX + z1 * cosX,
  };
}

function Structure3D({ compound }: { compound: NucleobaseCompound }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [rotation, setRotation] = useState({ x: -0.36, y: 0.55 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;
    const paint = () => {
      const width = Math.max(shell.clientWidth, 260);
      const height = 250;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const gradient = context.createRadialGradient(width * 0.48, height * 0.42, 5, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
      gradient.addColorStop(0, "#102936");
      gradient.addColorStop(1, "#07121b");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const rotated = compound.atoms.map((atom) => rotateAtom(atom, rotation.x, rotation.y));
      const minX = Math.min(...rotated.map((atom) => atom.x));
      const maxX = Math.max(...rotated.map((atom) => atom.x));
      const minY = Math.min(...rotated.map((atom) => atom.y));
      const maxY = Math.max(...rotated.map((atom) => atom.y));
      const scale = Math.min((width - 64) / Math.max(maxX - minX, 1), (height - 54) / Math.max(maxY - minY, 1));
      const centerX = width / 2 - ((minX + maxX) / 2) * scale;
      const centerY = height / 2 - ((minY + maxY) / 2) * scale;
      const projected = rotated.map((atom) => ({ ...atom, screenX: centerX + atom.x * scale, screenY: centerY + atom.y * scale }));

      context.lineCap = "round";
      compound.bonds.forEach((bond) => {
        const first = projected[bond.from];
        const second = projected[bond.to];
        const dx = second.screenX - first.screenX;
        const dy = second.screenY - first.screenY;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const offsetX = (-dy / length) * 3;
        const offsetY = (dx / length) * 3;
        const offsets = bond.order === 2 ? [-1, 1] : [0];
        offsets.forEach((offset) => {
          context.beginPath();
          context.moveTo(first.screenX + offsetX * offset, first.screenY + offsetY * offset);
          context.lineTo(second.screenX + offsetX * offset, second.screenY + offsetY * offset);
          context.strokeStyle = "rgba(188, 207, 216, 0.7)";
          context.lineWidth = 3;
          context.stroke();
        });
      });

      [...projected].sort((first, second) => first.z - second.z).forEach((atom) => {
        const radius = 12 + ((atom.z - Math.min(...rotated.map((item) => item.z))) / 5) * 5;
        const atomGradient = context.createRadialGradient(atom.screenX - radius * 0.35, atom.screenY - radius * 0.35, 1, atom.screenX, atom.screenY, radius);
        atomGradient.addColorStop(0, "#ffffff");
        atomGradient.addColorStop(0.22, ELEMENT_COLORS[atom.element]);
        atomGradient.addColorStop(1, "#15222b");
        context.beginPath();
        context.arc(atom.screenX, atom.screenY, radius, 0, Math.PI * 2);
        context.fillStyle = atomGradient;
        context.fill();
        context.strokeStyle = "rgba(255,255,255,.36)";
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = "600 10px Aptos, Segoe UI, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(atom.element, atom.screenX, atom.screenY + 0.5);
      });
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [compound, rotation]);

  return (
    <div className="compound-structure-3d" ref={shellRef}>
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label={`Interactive 3D ball-and-stick projection of ${compound.name}. Drag or use arrow keys to rotate.`}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          const dx = event.clientX - dragRef.current.x;
          const dy = event.clientY - dragRef.current.y;
          dragRef.current = { x: event.clientX, y: event.clientY };
          setRotation((current) => ({ x: current.x + dy * 0.012, y: current.y + dx * 0.012 }));
        }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
        onLostPointerCapture={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          const step = 0.12;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") event.preventDefault();
          if (event.key === "ArrowLeft") setRotation((current) => ({ ...current, y: current.y - step }));
          if (event.key === "ArrowRight") setRotation((current) => ({ ...current, y: current.y + step }));
          if (event.key === "ArrowUp") setRotation((current) => ({ ...current, x: current.x - step }));
          if (event.key === "ArrowDown") setRotation((current) => ({ ...current, x: current.x + step }));
        }}
      />
      <button type="button" onClick={() => setRotation({ x: -0.36, y: 0.55 })}><RotateCcw /> Reset view</button>
      <span>Drag to rotate</span>
    </div>
  );
}

export function NucleobasePanel({
  base,
  mode,
  sample,
  position,
  polymer = "dna",
}: {
  base: string;
  mode: Exclude<NucleotideDisplayMode, "letters">;
  sample: string;
  position: number;
  polymer?: "dna" | "rna";
}) {
  const compound = useMemo(() => compoundFor(base), [base]);

  if (!compound) {
    return (
      <section className="compound-panel compound-panel-empty">
        <div><span className="eyebrow">Selected symbol</span><strong>{base}</strong></div>
        <div><h4>No single molecular structure</h4><p>{base === "-" ? "An alignment gap is not a chemical compound." : "An ambiguous base represents more than one possible nucleobase."}</p></div>
      </section>
    );
  }

  return (
    <section className="compound-panel">
      <div className="compound-visual">
        {mode === "2d" ? <Structure2D compound={compound} /> : <Structure3D compound={compound} />}
      </div>
      <div className="compound-details">
        <div className="compound-title-row">
          <span className="compound-symbol">{compound.symbol}</span>
          <div><span className="eyebrow">{sample} · position {position}</span><h4>{compound.name}</h4><p>{compound.family} nucleobase · pairs with {polymer === "rna" && base === "A" ? "Uracil (U)" : compound.partner}</p></div>
        </div>
        <dl>
          <div><dt>Formula</dt><dd>{compound.formula}</dd></div>
          <div><dt>Molar mass</dt><dd>{compound.mass}</dd></div>
          <div><dt>PubChem CID</dt><dd><a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`} target="_blank" rel="noreferrer">{compound.cid}</a></dd></div>
          <div className="smiles-fact"><dt>SMILES</dt><dd>{compound.smiles}</dd></div>
        </dl>
        <p className="compound-note">Nucleobase only. Heavy atoms are shown; hydrogens are implicit. The {polymer === "rna" ? "ribose" : "deoxyribose"} sugar and phosphate backbone are not included.{mode === "3d" ? " The rotatable geometry is a connectivity-focused schematic, not an energy-minimized conformer." : ""}</p>
      </div>
    </section>
  );
}
