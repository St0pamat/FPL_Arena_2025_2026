/**
 * Prosty serwer produkcyjny dla zbudowanej aplikacji (SPA).
 * Uruchom po: npm run build
 *
 * Na DigitalOcean produkcja: Nginx (deploy/nginx.example.conf), nie ten serwer.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".zip": "application/zip",
};

/** Brak pliku statycznego = 404, NIE index.html (unika pobierania HTML jako WAV/ZIP). */
const STATIC_ASSET = /\.(wav|zip|png|jpe?g|gif|svg|ico|json|css|js|mjs|woff2?|webp|mp4|webm|map)$/i;

const DOWNLOAD_EXT = new Set([".wav", ".zip"]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";

    let filePath = path.join(DIST, pathname);
    const distResolved = path.resolve(DIST);
    if (!filePath.startsWith(distResolved + path.sep) && filePath !== distResolved) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let isFile = existsSync(filePath) && statSync(filePath).isFile();
    if (!isFile && !pathname.endsWith("/")) {
      if (STATIC_ASSET.test(pathname)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      filePath = path.join(DIST, "index.html");
      isFile = existsSync(filePath) && statSync(filePath).isFile();
    }

    if (!isFile) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": String(statSync(filePath).size),
    };
    if (DOWNLOAD_EXT.has(ext)) {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;
    }

    const body = await readFile(filePath);
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal error");
  }
});

server.listen(PORT, () => {
  console.log(`FPL Arena Skarb Kibica: http://localhost:${PORT}`);
});
