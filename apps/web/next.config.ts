import type { NextConfig } from "next";

const config: NextConfig = {
  // @casa/core ships TypeScript source; Next compiles it.
  transpilePackages: ["@casa/core"],
  // Kill-switch service workers (see public/sw-modern.js) must never be cached.
  async headers() {
    return ["/sw-modern.js", "/sw-legacy.js"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    }));
  },
};

export default config;
