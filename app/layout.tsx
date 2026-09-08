import type { Metadata } from "next";
import "./globals.css";
import { DataSession } from "@/components/data-session";
import { AppNavigation } from "@/components/app-navigation";

export const metadata: Metadata = {
  title: "CellOmics Explorer | Cell and multi-omics workbench",
  description:
    "Explore aligned DNA sequences, variant sites, evolutionary distances, and phylogenetic relationships.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><a className="skip-content" href="#main-content">Skip to workspace</a><DataSession><div className="platform-shell"><AppNavigation /><main id="main-content" className="platform-content">{children}</main></div></DataSession></body>
    </html>
  );
}
