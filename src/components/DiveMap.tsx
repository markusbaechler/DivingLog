"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  count?: number;
  href?: string;
}

export function DiveMap({
  points,
  height = "100%",
}: {
  points: MapPoint[];
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap-Mitwirkende",
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.layerGroup().addTo(map);
    const valid = points.filter(
      (p) => typeof p.lat === "number" && typeof p.lng === "number",
    );

    for (const p of valid) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          display:flex;align-items:center;justify-content:center;
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:#1463e1;border:2px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,.4);">
          <span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;">
            ${p.count ?? ""}
          </span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      const link = p.href
        ? `<br/><a href="${p.href}" style="color:#1463e1;">Tauchgänge ansehen →</a>`
        : "";
      marker.bindPopup(
        `<strong>${p.label}</strong>${
          p.count ? `<br/>${p.count} Tauchgang/-gänge` : ""
        }${link}`,
      );
    }

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 9);
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }

    return () => {
      layer.remove();
    };
  }, [points]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
