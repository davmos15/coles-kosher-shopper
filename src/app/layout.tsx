import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopping list",
  description: "Recipes in, one Coles list out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
