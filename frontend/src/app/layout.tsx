import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kostak Fraud Command",
  description: "Fraud monitoring and investigation platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}

