import type { NextConfig } from "next";

// Orígenes autorizados a embeber esta app en un <iframe> (S14 — Portal Integration).
// Sin esto, el navegador bloquea el embed por defecto en sitios cross-origin con cookies de sesión.
const FRAME_ANCESTORS = [
  "'self'",
  "https://architechia-portal.vercel.app",
  "https://*.architechia-portal.vercel.app",
  "http://localhost:*",
].join(" ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${FRAME_ANCESTORS};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
