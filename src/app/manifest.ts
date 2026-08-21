import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.businessName,
    short_name: "NG Training",
    description: `${brand.tagline} Personal training management for plans, workouts, progress, and appointment reminders.`,
    start_url: "/trainer/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#1c1917",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
