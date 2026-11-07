import type { MetadataRoute } from "next";

/** Preview deployments get their own name and icon so both apps can sit side by side on a home screen. */
const preview = process.env.VERCEL_ENV === "preview";
const prefix = preview ? "/icons/preview-" : "/icons/";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: preview ? "Casa Preview" : "Casa",
    short_name: preview ? "Casa Preview" : "Casa",
    description: "Panel de control de la casa",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1a1f26",
    theme_color: "#1a1f26",
    lang: "es",
    icons: [
      { src: `${prefix}icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${prefix}icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${prefix}icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
