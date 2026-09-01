import type { NextConfig } from "next";
import path from "path";

// ── Dev origins ────────────────────────────────────────────────────
// When accessing the Next.js dev server from another machine on the LAN,
// the HMR websocket is treated as a cross-origin request and must be
// explicitly allowed via `allowedDevOrigins`.
//
// Each developer has their own PC with a fixed IP and runs the full
// stack locally. We let them declare a comma-separated list of allowed
// origins/hosts via env. Next.js accepts both full URLs (e.g.
// "http://192.168.3.244:3000") and bare hosts (e.g. "192.168.3.244")
// in the same `allowedDevOrigins` array. Production builds ignore this.
const devAllowedEntries = (process.env.DEV_ALLOWED_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {},
  // `allowedDevOrigins` is used only in development to allow HMR websocket
  // cross-origin requests from other hosts on the LAN. Accepts both full
  // origins and bare hosts in the same list.
  // @ts-ignore - Next exposes this option at runtime
  allowedDevOrigins: [
    ...devAllowedEntries,
    "http://localhost:3000",
    "localhost",
  ],
  // Silence Turbopack workspace root warning in monorepo
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  // Proxy API requests to the backend server
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
