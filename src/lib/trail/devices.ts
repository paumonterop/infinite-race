/** Motxilles GPS conegudes (IP de cada una) i la seva etiqueta per defecte, com al servei GPS antic. Codi pur (client i servidor). */
export const KNOWN_DEVICE_IDS: string[] = [
  ...Array.from({ length: 12 }, (_, i) => `10.147.17.${11 + i}`), // BBX 01..12
  ...Array.from({ length: 11 }, (_, i) => `10.147.17.${30 + i}`), // BBX 30..40
];

export function defaultLabel(id: string): string {
  const m = /^10\.147\.17\.(\d+)$/.exec(id);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 11 && n <= 22) return `BBX ${String(n - 10).padStart(2, "0")}`;
    if (n >= 30 && n <= 40) return `BBX ${n}`;
  }
  return id;
}
