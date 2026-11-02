import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 注意：cacheComponents / partialPrefetching 會令 Leaflet 報
  // "Map container is being reused by another instance"（React Activity 保留 DOM 容器，
  // 與 react-leaflet 不相容），所以暫時關閉。加返呢啲要先改用 key 版 MapContainer。
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
