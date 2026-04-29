import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "mapbox-styles",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /^https:\/\/[a-z]\.tiles\.mapbox\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "mapbox-tiles",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 5000 },
        },
      },
      {
        urlPattern: /^https:\/\/events\.mapbox\.com\/.*/i,
        handler: "NetworkOnly",
        options: { cacheName: "mapbox-events" },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
