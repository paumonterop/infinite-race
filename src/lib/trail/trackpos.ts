/**
 * Controls d'una cursa amb el km sobre la traça (GPX). Es projecta cada control (lat/lon) al punt més proper de la traça
 * simplificada del navegador; si no té coordenades, s'escala el km de LiveTrail a la longitud del GPX.
 * Així el km mostrat coincideix amb la posició dibuixada al perfil.
 */
export function checkpointsOnTrack(race: {
  gpx: { total_km: number; track: number[][] } | null;
  checkpoints: { name: string; km: number; lat?: number | null; lon?: number | null }[];
}): { name: string; km: number }[] {
  const cps = race.checkpoints;
  const g = race.gpx;
  if (!g || g.track.length < 2) return cps.map((c) => ({ name: c.name, km: c.km }));
  const last = cps.length ? cps[cps.length - 1].km : g.total_km;
  const k = last > 0 ? g.total_km / last : 1;
  return cps.map((c) => {
    if (c.lat == null || c.lon == null) return { name: c.name, km: +(c.km * k).toFixed(2) };
    const kx = Math.cos((c.lat * Math.PI) / 180);
    let best = Infinity;
    let km = c.km * k;
    for (const p of g.track) {
      const d = (p[0] - c.lat) ** 2 + ((p[1] - c.lon) * kx) ** 2;
      if (d < best) {
        best = d;
        km = p[2];
      }
    }
    return { name: c.name, km: +km.toFixed(2) };
  });
}
