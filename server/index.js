/**
 * Prosty serwer produkcyjny dla zbudowanej aplikacji (SPA).
 * Uruchom po: npm run build
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";

    let filePath = path.join(DIST, pathname);
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const isFile = existsSync(filePath) && !pathname.endsWith("/");
    if (!isFile) {
      filePath = path.join(DIST, "index.html");
    }

    const ext = path.extname(filePath);
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`FPL Arena Skarb Kibica: http://localhost:${PORT}`);
});
