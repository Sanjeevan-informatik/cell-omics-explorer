"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dna,
  Download,
  FileUp,
  GitBranch,
  LoaderCircle,
  Maximize2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BaseStructureGlyph, NucleobasePanel, type NucleotideDisplayMode } from "@/components/nucleobase-viewer";
import { HierarchicalBiologyPanel } from "@/components/hierarchical-biology-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AnalysisResult,
  analyzeLocally,
  DistanceModel,
  SAMPLE_FASTA,
  TreeNode,
} from "@/lib/genome-analysis";
import { clearSequenceWorkspace, readSequenceWorkspace, saveSequenceWorkspace } from "@/lib/sequence-workspace";

const BASE_COLORS: Record<string, string> = {
  A: "#33d6a6", C: "#4d8dff", G: "#f4b942", T: "#f06d91", N: "#8592a6",
};
const MODEL_LABELS: Record<DistanceModel, string> = {
  "p-distance": "p-distance",
  jc69: "Jukes–Cantor (JC69)",
  k2p: "Kimura 2-parameter",
};

const ALIGNMENT_LABEL_WIDTH = 148;
const ALIGNMENT_ZOOM = {
  Compact: 22,
  Comfortable: 28,
  Large: 36,
} as const;

type AlignmentSite = {
  consensus: string;
  counts: Record<string, number>;
  isVariant: boolean;
};

function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

function BaseComposition({ result }: { result: AnalysisResult }) {
  return (
    <div className="composition-chart" aria-label="Base composition by sample">
      <div className="chart-legend">
        {Object.entries(BASE_COLORS).map(([base, color]) => <span key={base}><i style={{ background: color }} />{base}</span>)}
      </div>
      <div className="composition-rows">
        {result.composition.map((row) => {
          const total = row.A + row.C + row.G + row.T + row.N;
          return (
            <div className="composition-row" key={row.id}>
              <span className="sample-label" title={row.id}>{row.id.replace(/_/g, " ")}</span>
              <div className="stacked-bar" title={`${row.id}: ${row.gcPercent.toFixed(1)}% GC`}>
                {(["A", "C", "G", "T", "N"] as const).map((base) => row[base] > 0 && (
                  <span key={base} style={{ width: `${(row[base] / total) * 100}%`, background: BASE_COLORS[base] }} />
                ))}
              </div>
              <span className="gc-label">{row.gcPercent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VariantMap({ result }: { result: AnalysisResult }) {
  const maximum = Math.max(...result.variants.map((variant) =>
    variant.alternates.reduce((sum, base) => sum + (variant.counts[base] ?? 0), 0)), 1);
  if (!result.variants.length) return <div className="empty-state">No variable positions were detected.</div>;
  return (
    <div className="variant-panel">
      <div className="variant-track" aria-label={`${result.variants.length} variable positions`}>
        <div className="track-axis" />
        {result.variants.map((variant) => {
          const alternateCount = variant.alternates.reduce((sum, base) => sum + (variant.counts[base] ?? 0), 0);
          return (
            <button type="button" className="variant-marker" key={variant.position}
              style={{
                left: `${((variant.position - 1) / Math.max(result.sequenceLength - 1, 1)) * 100}%`,
                height: `${26 + (alternateCount / maximum) * 62}px`,
                background: BASE_COLORS[variant.alternates[0]] ?? BASE_COLORS.N,
              }}
              aria-label={`Position ${variant.position}: ${variant.reference} to ${variant.alternates.join(", ")}`}
              title={`Position ${variant.position}: ${variant.reference} → ${variant.alternates.join("/")}`}
            />
          );
        })}
        <span className="axis-start">1</span><span className="axis-end">{result.sequenceLength} bp</span>
      </div>
      <div className="variant-table-wrap">
        <table className="variant-table">
          <thead><tr><th>Position</th><th>Reference</th><th>Alternate</th><th>Allele count</th><th>Type</th></tr></thead>
          <tbody>{result.variants.slice(0, 10).map((variant) => {
            const alternate = variant.alternates[0];
            const transition = ["AG", "GA", "CT", "TC"].includes(`${variant.reference}${alternate}`);
            return (
              <tr key={variant.position}><td>{variant.position}</td>
                <td><span className="base-chip" style={{ background: `${BASE_COLORS[variant.reference]}22`, color: BASE_COLORS[variant.reference] }}>{variant.reference}</span></td>
                <td><span className="base-chip" style={{ background: `${BASE_COLORS[alternate]}22`, color: BASE_COLORS[alternate] }}>{alternate}</span></td>
                <td>{variant.counts[alternate] ?? 0} / {result.records.length}</td><td>{transition ? "Transition" : "Transversion"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function SequenceOverview({
  sites,
  selectedPosition,
  visibleRange,
  onSelect,
}: {
  sites: AlignmentSite[];
  selectedPosition: number;
  visibleRange: { start: number; end: number };
  onSelect: (position: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell || !sites.length) return;

    const paint = () => {
      const width = Math.max(shell.clientWidth, 1);
      const height = 54;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#08131d";
      context.fillRect(0, 0, width, height);

      sites.forEach((site, index) => {
        const start = (index / sites.length) * width;
        const end = ((index + 1) / sites.length) * width;
        context.fillStyle = BASE_COLORS[site.consensus] ?? BASE_COLORS.N;
        context.globalAlpha = site.isVariant ? 0.92 : 0.54;
        context.fillRect(start, 5, Math.max(end - start + 0.35, 0.7), 36);
        if (site.isVariant) {
          context.globalAlpha = 1;
          context.fillRect(start, 43, Math.max(end - start + 0.35, 1), 5);
        }
      });

      const viewportStart = (visibleRange.start / sites.length) * width;
      const viewportWidth = Math.max(((visibleRange.end - visibleRange.start) / sites.length) * width, 3);
      context.globalAlpha = 1;
      context.fillStyle = "rgba(7, 16, 25, 0.18)";
      context.fillRect(viewportStart, 3, viewportWidth, 47);
      context.strokeStyle = "rgba(255, 255, 255, 0.72)";
      context.lineWidth = 1;
      context.strokeRect(viewportStart + 0.5, 3.5, Math.max(viewportWidth - 1, 1), 46);

      const selectedX = ((selectedPosition + 0.5) / sites.length) * width;
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(selectedX, 1);
      context.lineTo(selectedX, 52);
      context.stroke();
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [selectedPosition, sites, visibleRange]);

  const choosePosition = (clientX: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const fraction = Math.min(0.999999, Math.max(0, (clientX - bounds.left) / bounds.width));
    onSelect(Math.floor(fraction * sites.length));
  };

  return (
    <div className="sequence-overview-shell" ref={shellRef}>
      <canvas
        ref={canvasRef}
        className="sequence-overview-canvas"
        role="slider"
        tabIndex={0}
        aria-label="Whole alignment position navigator"
        aria-valuemin={1}
        aria-valuemax={sites.length}
        aria-valuenow={selectedPosition + 1}
        onPointerDown={(event) => choosePosition(event.clientX)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSelect(Math.max(0, selectedPosition - 1));
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSelect(Math.min(sites.length - 1, selectedPosition + 1));
          }
          if (event.key === "Home") { event.preventDefault(); onSelect(0); }
          if (event.key === "End") { event.preventDefault(); onSelect(sites.length - 1); }
        }}
      />
    </div>
  );
}

export function SequenceMap({
  result,
  defaultPosition,
  displayMode = "letters",
  onOpenFullPage,
  onPositionChange,
}: {
  result: AnalysisResult;
  defaultPosition?: number;
  displayMode?: NucleotideDisplayMode;
  onOpenFullPage?: (position: number) => void;
  onPositionChange?: (position: number) => void;
}) {
  const firstVariant = Math.max(0, (result.variants[0]?.position ?? 1) - 1);
  const initialPosition = Math.min(result.sequenceLength - 1, Math.max(0, defaultPosition ?? firstVariant));
  const [selectedPosition, setSelectedPosition] = useState(initialPosition);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [cellWidth, setCellWidth] = useState<number>(ALIGNMENT_ZOOM.Comfortable);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(result.sequenceLength, 160) });
  const scrollRef = useRef<HTMLDivElement>(null);

  const sites = useMemo<AlignmentSite[]>(() => Array.from({ length: result.sequenceLength }, (_, index) => {
    const counts: Record<string, number> = {};
    result.records.forEach((record) => {
      const base = record.sequence[index];
      counts[base] = (counts[base] ?? 0) + 1;
    });
    const consensus = Object.entries(counts).sort(([firstBase, firstCount], [secondBase, secondCount]) =>
      secondCount - firstCount || firstBase.localeCompare(secondBase),
    )[0]?.[0] ?? "N";
    const canonicalAlleles = Object.keys(counts).filter((base) => "ACGT".includes(base));
    return { consensus, counts, isVariant: canonicalAlleles.length > 1 };
  }), [result]);

  const updateVisibleRange = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const overscan = 8;
    const start = Math.max(0, Math.floor(viewport.scrollLeft / cellWidth) - overscan);
    const visibleCells = Math.ceil(viewport.clientWidth / cellWidth) + overscan * 2;
    const end = Math.min(result.sequenceLength, start + visibleCells);
    setVisibleRange((current) => current.start === start && current.end === end ? current : { start, end });
  }, [cellWidth, result.sequenceLength]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateVisibleRange);
    window.addEventListener("resize", updateVisibleRange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateVisibleRange);
    };
  }, [updateVisibleRange]);

  useEffect(() => {
    if (defaultPosition === undefined) return;
    const frame = requestAnimationFrame(() => {
      setSelectedPosition(Math.min(result.sequenceLength - 1, Math.max(0, defaultPosition)));
    });
    return () => cancelAnimationFrame(frame);
  }, [defaultPosition, result.sequenceLength]);

  useEffect(() => {
    if (displayMode === "letters") return;
    const frame = requestAnimationFrame(() => setCellWidth(ALIGNMENT_ZOOM.Large));
    return () => cancelAnimationFrame(frame);
  }, [displayMode]);

  const selectPosition = (position: number) => {
    const bounded = Math.min(result.sequenceLength - 1, Math.max(0, position));
    setSelectedPosition(bounded);
    onPositionChange?.(bounded);
    return bounded;
  };

  const moveToPosition = (position: number, width = cellWidth) => {
    const bounded = selectPosition(position);
    const viewport = scrollRef.current;
    if (!viewport) return;
    const centered = bounded * width - (viewport.clientWidth - ALIGNMENT_LABEL_WIDTH) / 2;
    viewport.scrollTo({ left: Math.max(0, centered), behavior: "smooth" });
  };

  const changeZoom = (width: number) => {
    setCellWidth(width);
    requestAnimationFrame(() => moveToPosition(selectedPosition, width));
  };

  const selectedSite = sites[selectedPosition];
  const reference = result.records[0].sequence[selectedPosition];
  const alternateAlleles = Object.keys(selectedSite.counts).filter((base) => "ACGT".includes(base) && base !== reference);
  const changeType = !selectedSite.isVariant
    ? "Conserved"
    : alternateAlleles.length > 1
      ? "Multi-allelic"
      : ["AG", "GA", "CT", "TC"].includes(`${reference}${alternateAlleles[0]}`)
        ? "Transition"
        : "Transversion";
  const visiblePositions = Array.from(
    { length: Math.max(0, visibleRange.end - visibleRange.start) },
    (_, index) => visibleRange.start + index,
  );
  const sequenceWidth = result.sequenceLength * cellWidth;
  const consensusSequence = sites.map((site) => site.consensus).join("");
  const selectedBase = selectedSampleIndex === -1
    ? selectedSite.consensus
    : result.records[selectedSampleIndex].sequence[selectedPosition];
  const selectedSample = selectedSampleIndex === -1 ? "Consensus" : result.records[selectedSampleIndex].id.replace(/_/g, " ");

  const renderCells = (sequence: string, rowName: string, sampleIndex: number) => visiblePositions.map((position) => {
    const base = sequence[position] ?? "N";
    return (
      <button
        type="button"
        className={`alignment-base display-${displayMode} ${sites[position].isVariant ? "is-variant" : ""} ${position === selectedPosition && sampleIndex === selectedSampleIndex ? "is-selected" : ""}`}
        key={`${rowName}-${position}`}
        style={{ left: position * cellWidth, width: cellWidth, color: BASE_COLORS[base] ?? BASE_COLORS.N }}
        aria-label={`${rowName}, position ${position + 1}, base ${base}`}
        title={`${rowName} · ${position + 1}: ${base}`}
        onClick={() => { setSelectedSampleIndex(sampleIndex); selectPosition(position); }}
      >
        {displayMode === "letters" ? base : <BaseStructureGlyph base={base} mode={displayMode} />}
      </button>
    );
  });

  return (
    <div className="sequence-map">
      <section className="sequence-map-section compact-map">
        <div className="sequence-map-heading">
          <div><h4>Whole-sequence overview</h4><p>Every alignment position · click or use arrow keys to navigate</p></div>
          <div className="overview-actions">
            <div className="overview-legend"><span><i className="legend-variant" />Variable</span><span><i className="legend-window" />Visible window</span></div>
            {onOpenFullPage && <button type="button" className="open-sequence-page" onClick={() => onOpenFullPage(selectedPosition)}><Maximize2 /> Open full page</button>}
          </div>
        </div>
        <SequenceOverview sites={sites} selectedPosition={selectedPosition} visibleRange={visibleRange} onSelect={moveToPosition} />
        <div className="overview-axis"><span>1</span><span>{Math.ceil(result.sequenceLength / 2).toLocaleString()}</span><span>{result.sequenceLength.toLocaleString()} bp</span></div>
      </section>

      <section className="position-inspector" aria-live="polite">
        <div className="position-number"><span>Selected position</span><strong>{selectedPosition + 1}</strong><em className={selectedSite.isVariant ? "is-variable" : ""}>{changeType}</em></div>
        <div className="position-fact"><span>Reference</span><strong style={{ color: BASE_COLORS[reference] ?? BASE_COLORS.N }}>{reference}</strong></div>
        <div className="position-fact"><span>Consensus</span><strong style={{ color: BASE_COLORS[selectedSite.consensus] ?? BASE_COLORS.N }}>{selectedSite.consensus}</strong></div>
        <div className="allele-counts"><span>Allele counts</span><div>{Object.entries(selectedSite.counts).sort(([first], [second]) => first.localeCompare(second)).map(([base, count]) => <b key={base} style={{ color: BASE_COLORS[base] ?? BASE_COLORS.N }}>{base}<i>{count}</i></b>)}</div></div>
        <div className="position-nav">
          <button type="button" onClick={() => moveToPosition(selectedPosition - 1)} disabled={selectedPosition === 0} aria-label="Previous position"><ChevronLeft /></button>
          <button type="button" onClick={() => moveToPosition(selectedPosition + 1)} disabled={selectedPosition === result.sequenceLength - 1} aria-label="Next position"><ChevronRight /></button>
        </div>
      </section>

      {displayMode !== "letters" && <NucleobasePanel base={selectedBase} mode={displayMode} sample={selectedSample} position={selectedPosition + 1} />}

      <section className="sequence-map-section detail-map">
        <div className="sequence-map-heading">
          <div><h4>Full alignment explorer</h4><p>{result.records.length} samples × {result.sequenceLength.toLocaleString()} positions · select any cell to inspect its {displayMode === "letters" ? "base" : "compound"}</p></div>
          <div className="zoom-control" role="group" aria-label="Alignment cell size">
            {Object.entries(ALIGNMENT_ZOOM).map(([label, width]) => <button type="button" key={label} className={cellWidth === width ? "is-active" : ""} onClick={() => changeZoom(width)}>{label}</button>)}
          </div>
        </div>
        <div className="alignment-scroll" ref={scrollRef} onScroll={updateVisibleRange} tabIndex={0} aria-label="Scrollable DNA alignment">
          <div className="alignment-table" style={{ width: ALIGNMENT_LABEL_WIDTH + sequenceWidth }}>
            <div className="alignment-row ruler-row">
              <span className="alignment-row-label">Position</span>
              <div className="alignment-track ruler-track" style={{ width: sequenceWidth }}>
                {visiblePositions.map((position) => <span key={position} className={position === selectedPosition ? "is-selected" : ""} style={{ left: position * cellWidth, width: cellWidth }}>{position === 0 || (position + 1) % 10 === 0 || position === result.sequenceLength - 1 ? position + 1 : "·"}</span>)}
              </div>
            </div>
            <div className={`alignment-row consensus-row ${selectedSampleIndex === -1 ? "is-active-sample" : ""}`}>
              <span className="alignment-row-label"><b>Consensus</b><small>major allele</small></span>
              <div className="alignment-track" style={{ width: sequenceWidth }}>{renderCells(consensusSequence, "Consensus", -1)}</div>
            </div>
            {result.records.map((record, index) => (
              <div className={`alignment-row ${index === 0 ? "reference-row" : ""} ${index === selectedSampleIndex ? "is-active-sample" : ""}`} key={record.id}>
                <span className="alignment-row-label" title={record.id}><b>{record.id.replace(/_/g, " ")}</b><small>{index === 0 ? "reference" : `sample ${index + 1}`}</small></span>
                <div className="alignment-track" style={{ width: sequenceWidth }}>{renderCells(record.sequence, record.id, index)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="alignment-footnote"><span>Showing positions {visibleRange.start + 1}–{visibleRange.end} of {result.sequenceLength.toLocaleString()}</span><span>{displayMode === "letters" ? "Base color" : "Compound color"}: <b style={{ color: BASE_COLORS.A }}>A</b> <b style={{ color: BASE_COLORS.C }}>C</b> <b style={{ color: BASE_COLORS.G }}>G</b> <b style={{ color: BASE_COLORS.T }}>T</b> <b style={{ color: BASE_COLORS.N }}>N / gap</b></span></div>
      </section>
    </div>
  );
}

function DistanceHeatmap({ result }: { result: AnalysisResult }) {
  const finite = result.matrix.values.flat().filter((value): value is number => value !== null);
  const maximum = Math.max(...finite, 0.001);
  const columns = `minmax(118px, 1.4fr) repeat(${result.matrix.samples.length}, minmax(54px, 1fr))`;
  return (
    <div className="heatmap-scroll"><div className="heatmap" style={{ gridTemplateColumns: columns }}>
      <div />{result.matrix.samples.map((sample, index) => <div className="heatmap-column" key={sample}>S{index + 1}</div>)}
      {result.matrix.samples.map((sample, row) => (
        <div key={sample} style={{ display: "contents" }}>
          <div className="heatmap-label">{sample.replace(/_/g, " ")}</div>
          {result.matrix.values[row].map((value, column) => {
            const intensity = value === null ? 0 : value / maximum;
            return <div className={`heatmap-cell ${value === null ? "is-null" : ""}`} key={`${row}-${column}`}
              style={{ background: value === null ? undefined : `rgba(77, 141, 255, ${0.08 + intensity * 0.78})` }}
              title={`${sample} × ${result.matrix.samples[column]}: ${value === null ? "saturated" : value.toFixed(5)}`}>
              {value === null ? "—" : value.toFixed(3)}
            </div>;
          })}
        </div>
      ))}
    </div></div>
  );
}

function TreePlot({ root }: { root: TreeNode }) {
  type Positioned = { name?: string; height: number; x: number; y: number; children?: [Positioned, Positioned] };
  const width = 680;
  const height = 270;
  const tips: string[] = [];
  const collect = (node: TreeNode) => { if (node.name) tips.push(node.name); node.children?.forEach(collect); };
  collect(root);
  const maxHeight = Math.max(root.height, 0.0001);
  const yFor = new Map(tips.map((tip, index) => [tip, 34 + index * ((height - 68) / Math.max(tips.length - 1, 1))]));
  const position = (node: TreeNode): Positioned => {
    if (node.name) return { name: node.name, height: node.height, x: width - 158, y: yFor.get(node.name) ?? height / 2 };
    const children = node.children!.map(position) as [Positioned, Positioned];
    return { ...node, children, x: 38 + ((maxHeight - node.height) / maxHeight) * (width - 220), y: (children[0].y + children[1].y) / 2 };
  };
  const positioned = position(root);
  const lines: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  let key = 0;
  const draw = (node: Positioned) => {
    if (node.name) { labels.push(<text key={`label-${node.name}`} x={node.x + 12} y={node.y + 5}>{node.name.replace(/_/g, " ")}</text>); return; }
    const [first, second] = node.children!;
    lines.push(<line key={key++} x1={node.x} y1={first.y} x2={node.x} y2={second.y} className="tree-branch" />);
    node.children!.forEach((child) => {
      lines.push(<line key={key++} x1={node.x} y1={child.y} x2={child.x} y2={child.y} className="tree-branch" />);
      lines.push(<circle key={key++} cx={node.x} cy={child.y} r="3" className="tree-node" />);
      draw(child);
    });
  };
  draw(positioned);
  return <div className="tree-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="UPGMA phylogenetic tree">{lines}{labels}</svg></div>;
}

export function GenomeWorkbench() {
  const router = useRouter();
  const [fasta, setFasta] = useState(SAMPLE_FASTA);
  const [model, setModel] = useState<DistanceModel>("jc69");
  const [tab, setTab] = useState("overview");
  const [result, setResult] = useState(() => analyzeLocally(SAMPLE_FASTA, "jc69"));
  const [sequencePosition, setSequencePosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"browser" | "api">("browser");
  const fileInput = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const alignmentLabel = useMemo(() => `${result.records.length} × ${result.sequenceLength.toLocaleString()} bp`, [result]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = readSequenceWorkspace();
      if (!saved) return;
      try {
        setFasta(saved.fasta);
        setModel(saved.model);
        setResult(analyzeLocally(saved.fasta, saved.model));
        setSequencePosition(saved.selectedPosition);
        setEngine("browser");
      } catch {
        clearSequenceWorkspace();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const runAnalysis = async () => {
    setLoading(true); setError(null);
    try {
      if (apiBase) {
        const response = await fetch(`${apiBase}/api/v1/analyze`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fasta, model }),
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          throw new Error(detail?.detail ?? "The analysis service could not process this dataset.");
        }
        const analyzed = await response.json() as AnalysisResult;
        setResult(analyzed); setEngine("api");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 260));
        setResult(analyzeLocally(fasta, model)); setEngine("browser");
      }
      saveSequenceWorkspace({ fasta, model, selectedPosition: 0 });
      setSequencePosition(0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); }
    finally { setLoading(false); }
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5_000_000) { setError("Choose a FASTA file smaller than 5 MB for this demo."); return; }
    setFasta(await file.text()); setError(null);
  };

  const openSequencePage = (selectedPosition: number) => {
    try {
      analyzeLocally(fasta, model);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run a valid alignment before opening the full sequence page.");
      return;
    }
    if (!saveSequenceWorkspace({ fasta, model, selectedPosition })) {
      setError("Your browser blocked session storage, so the full page was not opened to avoid losing this alignment.");
      return;
    }
    router.push("/sequence-map");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark"><Dna aria-hidden="true" /></span><div><strong>CellOmics</strong><span>Sequence workbench</span></div></div>
        <div className="topbar-actions">
          <Badge variant="outline" className="engine-badge"><span className="status-dot" />{engine === "api" ? "FastAPI connected" : "Interactive demo"}</Badge>
          <a className="repo-link" href="#methods"><Braces /> Methods</a>
        </div>
      </header>
      <div className="workspace">
        <aside className="input-rail">
          <div className="section-heading"><div><span className="eyebrow">Input 01</span><h1>Aligned DNA</h1></div><Badge variant="secondary">FASTA</Badge></div>
          <p className="helper-copy">Paste an alignment or upload a FASTA file. Sequence IDs become sample labels.</p>
          <Textarea className="sequence-input" value={fasta} onChange={(event) => setFasta(event.target.value)} spellCheck={false} aria-label="Aligned FASTA sequences" />
          <input ref={fileInput} type="file" accept=".fa,.fas,.fasta,.txt,text/plain" hidden onChange={(event) => selectFile(event.target.files?.[0])} />
          <div className="input-actions">
            <Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp /> Upload</Button>
            <Button variant="ghost" onClick={() => { clearSequenceWorkspace(); setFasta(SAMPLE_FASTA); setSequencePosition(0); setError(null); }}><RefreshCw /> Reset</Button>
          </div>
          <div className="control-block">
            <label htmlFor="model-select">Substitution model</label>
            <Select value={model} onValueChange={(value) => setModel(value as DistanceModel)}>
              <SelectTrigger id="model-select" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="p-distance">p-distance</SelectItem><SelectItem value="jc69">Jukes–Cantor (JC69)</SelectItem><SelectItem value="k2p">Kimura 2-parameter</SelectItem></SelectContent>
            </Select>
            <p>{model === "jc69" ? "Corrects for multiple substitutions with equal base frequencies." : model === "k2p" ? "Models transitions and transversions at different rates." : "Observed mismatch proportion without evolutionary correction."}</p>
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
          <Button className="analyze-button" size="lg" onClick={runAnalysis} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Play />}{loading ? "Analyzing…" : "Run analysis"}</Button>
          <div className="privacy-note"><ShieldCheck /><span><strong>Privacy by design</strong>Demo analysis stays in your browser unless an API is configured.</span></div>
        </aside>
        <section className="results-stage">
          <div className="results-intro">
            <div><span className="eyebrow">Analysis 02</span><h2>Sequence and structure overview</h2></div>
            <div className="analysis-actions">
              <button type="button" onClick={() => download("cellomics-report.json", JSON.stringify(result, null, 2), "application/json")}><Download /> Report</button>
              <span className="analysis-state"><CheckCircle2 /> Ready <i>{MODEL_LABELS[model]}</i></span>
            </div>
          </div>
          <div className="metrics-grid">
            <MetricCard label="Samples" value={String(result.records.length)} detail="Aligned sequences" />
            <MetricCard label="Alignment" value={alignmentLabel} detail="Comparable dataset" />
            <MetricCard label="Variable sites" value={String(result.variants.length)} detail={`${((result.variants.length / result.sequenceLength) * 100).toFixed(1)}% of positions`} />
            <MetricCard label="Mean GC" value={`${result.metrics.meanGcPercent.toFixed(1)}%`} detail="Across all samples" />
          </div>
          <Tabs value={tab} onValueChange={setTab} className="analysis-tabs">
            <div className="tabs-header"><TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="hierarchy">Hierarchy</TabsTrigger><TabsTrigger value="sequence">Sequence map</TabsTrigger><TabsTrigger value="variants">Variants <span className="tab-count">{result.variants.length}</span></TabsTrigger><TabsTrigger value="distances">Distances</TabsTrigger>
            </TabsList><span className="dataset-id">DEMO · ALIGNMENT_A</span></div>
            <TabsContent value="overview" className="tab-panel">
              <section className="visual-card"><div className="card-heading"><div><h3>Base composition</h3><p>Relative nucleotide abundance per sequence</p></div><span>GC content</span></div><BaseComposition result={result} /></section>
              <section className="visual-card"><div className="card-heading"><div><h3>Phylogenetic structure</h3><p>UPGMA from {MODEL_LABELS[model]} distances</p></div><button className="icon-action" onClick={() => download("cellomics-tree.nwk", result.tree.newick)} title="Download Newick"><Download /></button></div><TreePlot root={result.tree.root} /><div className="newick-row"><span>Newick</span><code>{result.tree.newick}</code></div></section>
            </TabsContent>
                        <TabsContent value="hierarchy" className="tab-panel">
              <HierarchicalBiologyPanel />
            </TabsContent>
<TabsContent value="sequence" className="tab-panel"><section className="visual-card full-card"><div className="card-heading"><div><h3>DNA position explorer</h3><p>Linked whole-sequence map and base-by-base alignment</p></div><span>All {result.sequenceLength.toLocaleString()} positions</span></div><SequenceMap key={`${result.records.length}-${result.sequenceLength}-${result.variants.map((variant) => variant.position).join("-")}`} result={result} defaultPosition={sequencePosition} onPositionChange={setSequencePosition} onOpenFullPage={openSequencePage} /></section></TabsContent>
            <TabsContent value="variants" className="tab-panel"><section className="visual-card full-card"><div className="card-heading"><div><h3>Variant landscape</h3><p>Variable positions relative to {result.records[0].id}</p></div><span>{result.variants.length} sites</span></div><VariantMap result={result} /></section></TabsContent>
            <TabsContent value="distances" className="tab-panel"><section className="visual-card full-card"><div className="card-heading"><div><h3>Pairwise distance matrix</h3><p>{MODEL_LABELS[model]} substitutions per site</p></div><span>Darker = farther</span></div><DistanceHeatmap result={result} /></section></TabsContent>
          </Tabs>
        </section>
        <aside className="insight-rail">
          <div className="section-heading compact"><div><span className="eyebrow">Quality 03</span><h2>Data checks</h2></div><Sparkles /></div>
          <div className="quality-list">
            <div><span>Alignment</span><strong className="positive"><CheckCircle2 /> Valid</strong></div><div><span>Ambiguous bases</span><strong>{result.metrics.ambiguousBases}</strong></div><div><span>Transitions</span><strong>{result.metrics.transitions}</strong></div><div><span>Transversions</span><strong>{result.metrics.transversions}</strong></div><div><span>Ts/Tv ratio</span><strong>{result.metrics.transitionTransversionRatio?.toFixed(2) ?? "∞"}</strong></div>
          </div>
          <section className="insight-card"><span className="eyebrow">Interpretation</span><h3>{result.variants.length <= 10 ? "Closely related sequences" : "Moderate sequence diversity"}</h3><p>{result.variants.length} variable sites separate these samples. The tree groups sequences by corrected evolutionary distance.</p><button type="button" onClick={() => setTab("distances")}>Inspect distances <ChevronRight /></button></section>
          <section className="method-card" id="methods"><span className="eyebrow">Methods</span><ol>
            <li><span>1</span><div><strong>Validate</strong><p>Aligned FASTA and IUPAC-safe bases</p></div></li><li><span>2</span><div><strong>Compare</strong><p>Variants and pairwise distances</p></div></li><li><span>3</span><div><strong>Infer</strong><p>UPGMA tree with Newick export</p></div></li>
          </ol></section>
          <div className="tech-stack"><span>React + TypeScript</span><span>Python + FastAPI</span><span>Docker</span></div>
        </aside>
      </div>
      <footer><span>CellOmics Explorer</span><span>Transparent sequence analysis for research and learning.</span><a href="https://github.com/Sanjeevan-informatik/cell-omics-explorer" target="_blank" rel="noreferrer"><GitBranch /> Source code</a></footer>
    </main>
  );
}
