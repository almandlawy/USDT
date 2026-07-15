import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Gulf Gate", short_name: "Gulf Gate", start_url: "/ar", display: "standalone", background_color: "#06111f", theme_color: "#06111f", description: "Digital asset request management — pre-launch" };
}
