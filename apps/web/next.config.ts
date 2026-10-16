import type { NextConfig } from "next";

const config: NextConfig = {
  // @casa/core ships TypeScript source; Next compiles it.
  transpilePackages: ["@casa/core"],
};

export default config;
