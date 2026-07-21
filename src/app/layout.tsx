import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/lib/supabase/provider";

export const metadata: Metadata = {
  title: "Shopping list",
  description: "Recipes in, one Coles list out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
