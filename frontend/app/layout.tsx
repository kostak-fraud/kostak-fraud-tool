import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kostak Fraud Tool",
  description: "Foundation scaffold for the Kostak Fraud Tool",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
