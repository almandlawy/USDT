import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gulf Gate — Digital Asset Request Management",
    short_name: "Gulf Gate",
    description: "Bilingual digital-asset request management in pre-launch mode.",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    background_color: "#06111f",
    theme_color: "#06111f",
    lang: "ar-IQ",
    dir: "rtl",
    categories: ["finance", "business"],
    icons: [{src:"/favicon.ico",sizes:"any",type:"image/x-icon"}],
  };
}
