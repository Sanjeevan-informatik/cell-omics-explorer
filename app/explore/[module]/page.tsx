import { notFound } from "next/navigation";
import { ExplorerFrame } from "@/components/explorer-frame";
import { WORKSPACES } from "@/lib/workspaces";

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const workspace = WORKSPACES.find((item) => item.id === module);
  if (!workspace) notFound();
  return <ExplorerFrame key={workspace.id} module={workspace.id} />;
}
