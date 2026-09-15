"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Dna, Download, FileUp, Play, RefreshCw } from "lucide-react";
import { SequenceMap } from "@/components/genome-workbench";
import type { NucleotideDisplayMode } from "@/components/nucleobase-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AnalysisResult, analyzeLocally, DistanceModel, SAMPLE_FASTA } from "@/lib/genome-analysis";
import { clearSequenceWorkspace, readSequenceWorkspace, saveSequenceWorkspace } from "@/lib/sequence-workspace";

const MODEL_LABELS: Record<DistanceModel, string> = {
  "p-distance": "p-distance",
  jc69: "Jukes–Cantor (JC69)",
  k2p: "Kimura 2-parameter",
};

function downloadFasta(fasta: string) {
  const url = URL.createObjectURL(new Blob([fasta], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cellomics-alignment.fasta";
  link.click();
  URL.revokeObjectURL(url);
}

export function SequenceMapPage() {
  const [fasta, setFasta] = useState(SAMPLE_FASTA);
  const [model, setModel] = useState<DistanceModel>("jc69");
  const [activeFasta, setActiveFasta] = useState(SAMPLE_FASTA);
  const [activeModel, setActiveModel] = useState<DistanceModel>("jc69");
  const [result, setResult] = useState<AnalysisResult>(() => analyzeLocally(SAMPLE_FASTA, "jc69"));
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [displayMode, setDisplayMode] = useState<NucleotideDisplayMode>("letters");
  const [revision, setRevision] = useState(0);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = readSequenceWorkspace();
      if (!saved) return;
      try {
        const analyzed = analyzeLocally(saved.fasta, saved.model);
        setFasta(saved.fasta);
        setModel(saved.model);
        setActiveFasta(saved.fasta);
        setActiveModel(saved.model);
        setResult(analyzed);
        setSelectedPosition(Math.min(saved.selectedPosition, analyzed.sequenceLength - 1));
        setRevision((current) => current + 1);
        setRestored(true);
      } catch {
        clearSequenceWorkspace();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const runAnalysis = () => {
    setError(null);
    try {
      const analyzed = analyzeLocally(fasta, model);
      const nextPosition = Math.max(0, (analyzed.variants[0]?.position ?? 1) - 1);
      setResult(analyzed);
      setActiveFasta(fasta);
      setActiveModel(model);
      setSelectedPosition(nextPosition);
      setRevision((current) => current + 1);
      setRestored(true);
      saveSequenceWorkspace({ fasta, model, selectedPosition: nextPosition });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The alignment could not be analyzed.");
    }
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("Choose a FASTA file smaller than 5 MB for this browser-based viewer.");
      return;
    }
    setFasta(await file.text());
    setError(null);
  };

  const resetWorkspace = () => {
    const analyzed = analyzeLocally(SAMPLE_FASTA, "jc69");
    const nextPosition = Math.max(0, (analyzed.variants[0]?.position ?? 1) - 1);
    clearSequenceWorkspace();
    setFasta(SAMPLE_FASTA);
    setModel("jc69");
    setActiveFasta(SAMPLE_FASTA);
    setActiveModel("jc69");
    setResult(analyzed);
    setSelectedPosition(nextPosition);
    setRevision((current) => current + 1);
    setRestored(false);
  };

  const preserveWorkspace = () => {
    saveSequenceWorkspace({ fasta: activeFasta, model: activeModel, selectedPosition });
  };

  return (
    <main className="sequence-page-shell">
      <header className="sequence-page-topbar">
        <Link href="/genomics" className="sequence-back-link" onClick={preserveWorkspace}><ArrowLeft /> Analysis dashboard</Link>
        <div className="sequence-page-brand"><span><Dna /></span><div><strong>CellOmics</strong><small>Full sequence map</small></div></div>
        <Badge variant="outline" className="engine-badge"><span className="status-dot" />Local analysis</Badge>
      </header>

      <section className="sequence-page-content">
        <div className="sequence-page-intro">
          <div><span className="eyebrow">Dedicated workspace</span><h1>DNA position map</h1><p>Navigate the complete alignment without leaving out samples, variants, or nucleotide positions.</p></div>
          <div className="sequence-page-actions">
            <span className="workspace-state"><CheckCircle2 />{restored ? "Current analysis restored" : "Example alignment"}</span>
            <Button variant="outline" onClick={() => downloadFasta(activeFasta)}><Download /> Export FASTA</Button>
          </div>
        </div>

        <div className="sequence-page-metrics" aria-label="Alignment summary">
          <div><span>Samples</span><strong>{result.records.length}</strong></div>
          <div><span>Positions</span><strong>{result.sequenceLength.toLocaleString()}</strong></div>
          <div><span>Variable sites</span><strong>{result.variants.length}</strong></div>
          <div><span>Distance model</span><strong>{MODEL_LABELS[activeModel]}</strong></div>
        </div>

        <details className="sequence-data-editor">
          <summary><span><strong>Change alignment or model</strong><small>The map remains visible until you run the updated analysis.</small></span><span className="editor-summary-action">Edit data</span></summary>
          <div className="sequence-editor-body">
            <div className="sequence-editor-input">
              <label htmlFor="full-page-fasta">Aligned FASTA</label>
              <Textarea id="full-page-fasta" value={fasta} onChange={(event) => setFasta(event.target.value)} spellCheck={false} />
            </div>
            <div className="sequence-editor-controls">
              <label htmlFor="full-page-model">Substitution model</label>
              <Select value={model} onValueChange={(value) => setModel(value as DistanceModel)}>
                <SelectTrigger id="full-page-model"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="p-distance">p-distance</SelectItem><SelectItem value="jc69">Jukes–Cantor (JC69)</SelectItem><SelectItem value="k2p">Kimura 2-parameter</SelectItem></SelectContent>
              </Select>
              <input ref={fileInput} type="file" accept=".fa,.fas,.fasta,.txt,text/plain" hidden onChange={(event) => selectFile(event.target.files?.[0])} />
              <Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp /> Upload FASTA</Button>
              <Button variant="ghost" onClick={resetWorkspace}><RefreshCw /> Use example</Button>
              {error && <div className="error-message" role="alert">{error}</div>}
              <Button className="analyze-button" onClick={runAnalysis}><Play /> Update sequence map</Button>
            </div>
          </div>
        </details>

        <section className="molecule-mode-bar" aria-label="Nucleotide representation">
          <div><strong>Base representation</strong><small>Choose letters for alignment reading or a chemical view for compound inspection.</small></div>
          <div className="molecule-mode-switch" role="group" aria-label="Base representation mode">
            {([
              ["letters", "Base letters"],
              ["2d", "2D structures"],
              ["3d", "3D molecule"],
            ] as Array<[NucleotideDisplayMode, string]>).map(([value, label]) => (
              <button type="button" key={value} className={displayMode === value ? "is-active" : ""} aria-pressed={displayMode === value} onClick={() => setDisplayMode(value)}>{label}</button>
            ))}
          </div>
        </section>

        <section className="visual-card standalone-map-card">
          <div className="card-heading"><div><h2>Complete alignment</h2><p>Overview, selected-site evidence, consensus, and every sample base in one linked view</p></div><span>{result.sequenceLength.toLocaleString()} positions</span></div>
          <SequenceMap
            key={`${revision}-${result.records.length}-${result.sequenceLength}`}
            result={result}
            defaultPosition={selectedPosition}
            displayMode={displayMode}
            onPositionChange={setSelectedPosition}
          />
        </section>
      </section>
    </main>
  );
}
