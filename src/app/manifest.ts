import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gulf Gate",
    short_name: "Gulf Gate",
    description: "Pre-launch workspace for managing demo USDT and digital-asset requests.",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    background_color: "#071426",
    theme_color: "#071426",
    lang: "ar-IQ",
    dir: "rtl",
    categories: ["finance", "business"],
    icons: [
      { src: "/favicon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      { src: "/maskable-icon-192.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
      { src: "/maskable-icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
