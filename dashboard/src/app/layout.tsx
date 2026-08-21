import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget App · Governance Review",
  description:
    "Human review gate for Budget App PRs — AST, OWASP, fuzz, Big-O, copyright.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="mx-auto max-w-6xl px-5 py-10">{children}</div>
      </body>
    </html>
  );
}
