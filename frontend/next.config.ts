import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow dev origins when accessing the dev server from another host on the LAN
  // Add the host or full origin you use to access the app from another device
  // Example: http://192.168.3.244:3000
  experimental: {},
  // `allowedDevOrigins` is used only in development to allow HMR websocket cross-origin
  // requests from other hosts on the LAN.
  // @ts-ignore - Next exposes this option at runtime
  allowedDevOrigins: [
    process.env.DEV_ALLOWED_ORIGIN ?? 'http://26.243.170.131:3000',
    process.env.DEV_ALLOWED_ORIGIN_HOST ?? '26.243.170.131',
    'http://localhost:3000',
    'localhost',
  ],
  // Silence Turbopack workspace root warning in monorepo
  turbopack: {
    root: path.resolve(__dirname, '..')
  }
};

export default nextConfig;
