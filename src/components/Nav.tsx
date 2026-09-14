"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/control", label: "Control de Volta" },
  { href: "/runners", label: "Corredors" },
  { href: "/leaderboard", label: "Classificacions" },
  { href: "/stats", label: "Estadístiques" },
  { href: "/import", label: "Importar" },
  { href: "/broadcast-control", label: "Broadcast" },
  { href: "/config", label: "Configuració" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f14]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 py-2">
        <span className="mr-4 shrink-0 font-black tracking-tight text-sky-400">
          ⏱ INFINITE&nbsp;RACE
        </span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sky-500 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
