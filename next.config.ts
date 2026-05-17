import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // User recipe images may be any HTTPS origin; allows next/image across hosts.
    // See https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
    remotePatterns: [new URL("https:///**/*")],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
