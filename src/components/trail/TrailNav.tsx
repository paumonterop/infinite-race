"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";

export default function TrailNav({ eventId, name }: { eventId: string; name?: string }) {
  const pathname = usePathname();
  const links = [
    { href: `/events/${eventId}`, label: "Cursa" },
    { href: `/events/${eventId}/map`, label: "Mapa GPS" },
  ];
  return (
    <nav className="sticky top-0 z-[1000] border-b border-white/10 bg-[#0b0f14]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 py-2">
        <Link href="/" className="mr-3 shrink-0 font-black tracking-tight text-sky-400">
          ◀ {BRAND}
        </Link>
        {name && <span className="mr-4 shrink-0 text-sm font-bold text-slate-300">{name}</span>}
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === l.href ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
