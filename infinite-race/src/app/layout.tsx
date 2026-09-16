import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INFINITE RACE — Race Control",
  description: "Backyard Ultra / Infinite Race control center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body className="antialiased">{children}</body>
    </html>
  );
}
