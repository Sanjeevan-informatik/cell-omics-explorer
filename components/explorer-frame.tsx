import { WORKSPACES, type WorkspaceId } from "@/lib/workspaces";

export function ExplorerFrame({ module = "cell" }: { module?: WorkspaceId }) {
  const workspace = WORKSPACES.find((item) => item.id === module)!;
  return <section className="explorer-workspace">
    <header className="explorer-heading"><div><h1>{workspace.label}</h1><p>{workspace.detail}</p></div><span className="scope-badge">{module === "loader" ? "Local file preview" : "Synthetic teaching data"}</span></header>
    <iframe key={module} className="explorer-frame" title={workspace.label} src={`/explorer/index.html?embedded=1#${module}`} sandbox="allow-scripts allow-downloads" />
  </section>;
}
