import type { Metadata } from "next";
import { SequenceMapPage } from "@/components/sequence-map-page";

export const metadata: Metadata = {
  title: "Full DNA Position Map | CellOmics Explorer",
  description: "Inspect every position, consensus base, allele count, and sample sequence in an aligned DNA dataset.",
};

export default function FullSequenceMap() {
  return <SequenceMapPage />;
}
