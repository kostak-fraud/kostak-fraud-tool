import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kostak Fraud Tool",
  description: "Fraud monitoring workspace for payment transactions and rules.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
