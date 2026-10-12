"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { GpsPosition } from "@/lib/trail/types";

interface Props {
  races: any[];
  devices: GpsPosition[];
  hidden: Record<string, boolean>;
  focus: string | null; // "<deviceId>:<timestamp>" per forçar re-centrat
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

export default function TrailMap({ races, devices, hidden, focus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const trackLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const fitted = useRef(false);
  const lastTrackKey = useRef("");

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([42.1, 2.2], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    trackLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markers.current = {};
    };
  }, []);

  // Traces i punts de control
  useEffect(() => {
    const m = map.current;
    const g = trackLayer.current;
    if (!m || !g) return;
    const key = JSON.stringify(races.map((r) => [r.id, !!r.gpx, r.gpx?.total_km, r.checkpoints.length, !!hidden[r.id]]));
    if (key === lastTrackKey.current) return;
    lastTrackKey.current = key;
    g.clearLayers();
    const all: L.LatLngExpression[] = [];
    for (const r of races) {
      if (hidden[r.id]) continue;
      if (r.gpx) {
        const pts = r.gpx.track.map((p: number[]) => [p[0], p[1]] as L.LatLngExpression);
        L.polyline(pts, { color: r.color, weight: 4, opacity: 0.9 }).addTo(g).bindTooltip(r.name, { sticky: true });
        all.push(...pts);
      }
      for (const c of r.checkpoints) {
        if (c.lat == null || c.lon == null) continue;
        L.circleMarker([c.lat, c.lon], { radius: 5, color: "#0b0f14", weight: 2, fillColor: r.color, fillOpacity: 1 })
          .addTo(g)
          .bindTooltip(`${c.name} · km ${c.km}`);
      }
    }
    if (!fitted.current && all.length) {
      m.fitBounds(L.latLngBounds(all), { padding: [30, 30] });
      fitted.current = true;
    }
  }, [races, hidden]);

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
