"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { LookEvent } from "@/lib/events";

const categoryColor: Record<string, string> = {
  展覽: "#5B2A86",
  劇場: "#FF4F9A",
  電影: "#1F3FBF",
  音樂: "#111111",
};

function pinIcon(category: string, active: boolean) {
  const color = categoryColor[category] ?? "#5B2A86";
  const size = active ? 36 : 28;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function EventsMap({
  events,
  activeSlug,
}: {
  events: LookEvent[];
  activeSlug?: string;
}) {
  const center: [number, number] = [22.295, 114.17];
  return (
    <MapContainer
      key={events.map((e) => e.slug).join("|")} // 唔同活動清單時強制重置，避開 Leaflet 容器重用錯誤
      center={center}
      zoom={13}
      scrollWheelZoom
      className="z-0 h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {events.map((e) => (
        <Marker
          key={e.slug}
          position={[e.lat, e.lng]}
          icon={pinIcon(e.category, e.slug === activeSlug)}
        >
          <Popup>
            <a href={`/events/${e.slug}`} style={{ fontWeight: 700 }}>
              {e.titleZh}
            </a>
            <br />
            {e.venueZh}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
