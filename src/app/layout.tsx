import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GFX SPORT", template: "%s · GFX SPORT" },
  description: "Suite de grafismes esportius: backyard, curses de muntanya i més",
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
