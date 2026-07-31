/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  typescript: {
    // Legacy src/ ma luźniejsze typy (Vite); Next sprawdza tylko app/ + components/
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev }) => {
    // OneDrive + ścieżka ze znakami specjalnymi psują PackFileCache → 404 na chunki JS.
    if (dev) config.cache = false;

    config.resolve.alias = {
      ...config.resolve.alias,
      "@arena": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
