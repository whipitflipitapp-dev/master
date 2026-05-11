import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // User recipe images may be any HTTPS origin; allows next/image across hosts.
    // See https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
    remotePatterns: [new URL("https:///**/*")],
  },
};

export default nextConfig;
