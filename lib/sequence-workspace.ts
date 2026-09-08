import type { DistanceModel } from "@/lib/genome-analysis";

export const SEQUENCE_WORKSPACE_KEY = "genomevista:sequence-workspace";

export type SequenceWorkspaceSnapshot = {
  fasta: string;
  model: DistanceModel;
  selectedPosition: number;
};

const MODELS = new Set<DistanceModel>(["p-distance", "jc69", "k2p"]);

export function saveSequenceWorkspace(snapshot: SequenceWorkspaceSnapshot) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(SEQUENCE_WORKSPACE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function readSequenceWorkspace(): SequenceWorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SEQUENCE_WORKSPACE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SequenceWorkspaceSnapshot>;
    if (typeof value.fasta !== "string" || !value.fasta.trim()) return null;
    if (!MODELS.has(value.model as DistanceModel)) return null;
    return {
      fasta: value.fasta,
      model: value.model as DistanceModel,
      selectedPosition: Number.isInteger(value.selectedPosition) ? Math.max(0, value.selectedPosition as number) : 0,
    };
  } catch {
    return null;
  }
}

export function clearSequenceWorkspace() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SEQUENCE_WORKSPACE_KEY);
  } catch {
    // Storage can be unavailable in locked-down browser sessions.
  }
}
