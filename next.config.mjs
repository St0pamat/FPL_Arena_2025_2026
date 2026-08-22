/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

// Dev na Windows: Node nie ma CA z antywirusa → fetch do Supabase/Google pada.
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    instrumentationHook: true,
  },
  typescript: {
    // Legacy src/ ma luźniejsze typy (Vite); Next sprawdza tylko app/ + components/
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Runtime uploads → API (niezawodne serwowanie plików dopisanych po buildzie)
    return [
      {
        source: "/uploads/logos/:file",
        destination: "/api/uploads/logos/:file",
      },
      {
        source: "/uploads/tier-logos/:file",
        destination: "/api/uploads/tier-logos/:file",
      },
      {
        source: "/uploads/no-big-six-logos/:file",
        destination: "/api/uploads/no-big-six-logos/:file",
      },
      // Seed + stare uploady do public/tier-logos/ (też przez API z dysku)
      {
        source: "/tier-logos/:file",
        destination: "/api/uploads/tier-logos/:file",
      },
    ];
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
