"use client";

import dynamic from "next/dynamic";
import type { LookEvent } from "@/lib/events";

const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#eef2f4]">
      <p className="text-sm text-gray-500">載入地圖中…</p>
    </div>
  ),
});

export default function MapShell({
  events,
  activeSlug,
}: {
  events: LookEvent[];
  activeSlug?: string;
}) {
  return <EventsMap events={events} activeSlug={activeSlug} />;
}
