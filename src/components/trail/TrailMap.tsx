"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { Leader } from "@/lib/trail/estimate";
import type { GpsPosition } from "@/lib/trail/types";

interface Props {
  races: any[];
  devices: GpsPosition[];
  hidden: Record<string, boolean>;
  focus: string | null; // "<deviceId>:<timestamp>" per forçar re-centrat sobre una motxilla
  focusRaceId?: string | null; // cursa seleccionada a les pestanyes del perfil: es ressalta i s'hi centra el mapa
  hoverPoint?: [number, number] | null; // punt del perfil sota el ratolí
  leaders?: Record<string, Leader[]>; // primers de cada cursa (posició estimada)
}

function markerIcon(label: string, color: string, online: boolean, off: boolean) {
  const bg = online ? color : "#475569";
  const ring = off ? "#ef4444" : "#0b0f14";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-8px)">
      <div style="width:16px;height:16px;border-radius:50%;background:${bg};border:3px solid ${ring};box-shadow:0 0 6px rgba(0,0,0,.6)"></div>
      <div style="margin-top:2px;padding:1px 6px;border-radius:4px;background:rgba(11,15,20,.9);color:#fff;font:700 11px system-ui;white-space:nowrap">${label}</div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function leaderIcon(rank: number, color: string, estimated: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:${estimated ? "2px dashed" : "3px solid"} #fff;color:#0b0f14;font:900 13px system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 0 7px rgba(0,0,0,.75)">${rank}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const ord = (n: number) => (n === 1 ? "1r" : n === 2 ? "2n" : n === 3 ? "3r" : n === 4 ? "4t" : `${n}è`);
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" }) : "");

export default function TrailMap({ races, devices, hidden, focus, focusRaceId, hoverPoint, leaders }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const trackLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const hoverMarker = useRef<L.CircleMarker | null>(null);
  const leaderMarkers = useRef<Record<string, L.Marker>>({});
  const fitted = useRef(false);
  const lastTrackKey = useRef("");
  const lastFocusRace = useRef<string | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([42.1, 2.2], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    trackLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    // el contenidor pot canviar de mida (perfil plegat/desplegat, finestra): el mapa s'ha de recalcular
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markers.current = {};
      leaderMarkers.current = {};
      hoverMarker.current = null;
    };
  }, []);

  // Traces i punts de control (la cursa seleccionada es dibuixa més gruixuda; les altres, més suaus)
  useEffect(() => {
    const m = map.current;
    const g = trackLayer.current;
    if (!m || !g) return;
    const key = JSON.stringify([races.map((r) => [r.id, !!r.gpx, r.gpx?.total_km, r.checkpoints.length, !!hidden[r.id]]), focusRaceId]);
    if (key === lastTrackKey.current) return;
    lastTrackKey.current = key;
    g.clearLayers();
    const all: L.LatLngExpression[] = [];
    for (const r of races) {
      if (hidden[r.id]) continue;
      const focused = !focusRaceId || r.id === focusRaceId;
      if (r.gpx) {
        const pts = r.gpx.track.map((p: number[]) => [p[0], p[1]] as L.LatLngExpression);
        L.polyline(pts, { color: r.color, weight: focused ? 6 : 3, opacity: focused ? 0.95 : 0.45 }).addTo(g).bindTooltip(r.name, { sticky: true });
        all.push(...pts);
      }
      for (const c of r.checkpoints) {
        if (c.lat == null || c.lon == null) continue;
        L.circleMarker([c.lat, c.lon], { radius: focused ? 6 : 4, color: "#0b0f14", weight: 2, fillColor: r.color, fillOpacity: focused ? 1 : 0.6 })
          .addTo(g)
          .bindTooltip(`${c.name} · km ${c.km}`);
      }
    }
    if (!fitted.current && all.length) {
      m.fitBounds(L.latLngBounds(all), { padding: [30, 30] });
      fitted.current = true;
    }
  }, [races, hidden, focusRaceId]);

  // En triar una cursa a les pestanyes del perfil, el mapa s'hi centra
  useEffect(() => {
    const m = map.current;
    if (!m || !focusRaceId || lastFocusRace.current === focusRaceId) return;
    const r = races.find((x) => x.id === focusRaceId);
    if (!r?.gpx) return;
    lastFocusRace.current = focusRaceId;
    m.fitBounds(L.latLngBounds(r.gpx.track.map((p: number[]) => [p[0], p[1]] as L.LatLngExpression)), { padding: [30, 30] });
    fitted.current = true;
  }, [focusRaceId, races]);

  // Punt sota el ratolí al perfil
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!hoverPoint) {
      hoverMarker.current?.remove();
      hoverMarker.current = null;
      return;
    }
    const color = races.find((r) => r.id === focusRaceId)?.color ?? "#0ea5e9";
    if (!hoverMarker.current) {
      hoverMarker.current = L.circleMarker(hoverPoint, { radius: 9, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1, interactive: false }).addTo(m);
    } else {
      hoverMarker.current.setLatLng(hoverPoint);
      hoverMarker.current.setStyle({ fillColor: color });
    }
  }, [hoverPoint, races, focusRaceId]);

  // Primers de cada cursa (posició estimada): cercle amb la posició; vora discontínua = estimat entre controls
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const [raceId, list] of Object.entries(leaders ?? {})) {
      const race = races.find((r) => r.id === raceId);
      if (!race || hidden[raceId]) continue;
      for (const l of list) {
        const key = `${raceId}:${l.bib}`;
        seen.add(key);
        const tip =
          `<b>${ord(l.rank)} · #${l.bib} ${l.name}</b><br>${race.name}<br>km ${l.km.toFixed(1)}${l.estimated ? " (estimat)" : ""}` +
          (l.next_point ? `<br>Proper control: ${l.next_point} ${hhmm(l.next_eta)} (previst)` : l.status === "FINISHED" ? "<br>Arribat" : "");
        let mk = leaderMarkers.current[key];
        if (!mk) {
          mk = L.marker([l.lat, l.lon], { icon: leaderIcon(l.rank, race.color, l.estimated), zIndexOffset: 500 - l.rank }).addTo(m);
          mk.bindTooltip(tip, { direction: "top", offset: [0, -12] });
          leaderMarkers.current[key] = mk;
        } else {
          mk.setLatLng([l.lat, l.lon]);
          mk.setIcon(leaderIcon(l.rank, race.color, l.estimated));
          mk.setZIndexOffset(500 - l.rank);
          mk.setTooltipContent(tip);
        }
      }
    }
    for (const key of Object.keys(leaderMarkers.current)) {
      if (!seen.has(key)) {
        leaderMarkers.current[key].remove();
        delete leaderMarkers.current[key];
      }
    }
  }, [leaders, races, hidden]);

  // Motxilles
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const d of devices) {
      if (d.lat == null || d.lon == null) continue;
      seen.add(d.id);
      const race = races.find((r) => r.id === d.race_id);
      const color = race?.color ?? "#94a3b8";
      const label = d.bib ? `#${d.bib}${d.runner_name ? " " + d.runner_name.split(" ")[0] : ""}` : d.label;
      const icon = markerIcon(label, color, d.status === "online", d.off_route);
      const hide = race && hidden[race.id];
      let mk = markers.current[d.id];
      if (!mk) {
        mk = L.marker([d.lat, d.lon], { icon }).addTo(m);
        markers.current[d.id] = mk;
      } else {
        mk.setLatLng([d.lat, d.lon]);
        mk.setIcon(icon);
      }
      mk.setOpacity(hide ? 0 : d.status === "online" ? 1 : 0.5);
      mk.bindPopup(
        `<b>${d.label}</b>${d.runner_name ? `<br>#${d.bib} ${d.runner_name}` : ""}<br>${d.status}` +
          `${d.km != null ? `<br>km ${d.km} (${d.pct}%)` : ""}` +
          `${d.speed_kmh != null ? `<br>${d.speed_kmh.toFixed(1)} km/h` : ""}`
      );
    }
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    }
    if (!fitted.current && seen.size) {
      const pts = devices.filter((d) => d.lat != null).map((d) => [d.lat!, d.lon!] as L.LatLngExpression);
      m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    }
  }, [devices, races, hidden]);

  useEffect(() => {
    if (!focus || !map.current) return;
    const id = focus.split(":")[0];
    const mk = markers.current[id];
    if (mk) {
      map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 15));
      mk.openPopup();
    }
  }, [focus]);

  return <div ref={el} className="absolute inset-0" />;
}
