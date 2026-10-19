import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT || 3000);
const base = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
if (!base.startsWith("/") || base.includes(".."))
  throw new Error("BASE_PATH must be an absolute URL path");
try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error("Build missing. Run npm run build first.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://telegram.org https://core.telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors https://web.telegram.org https://*.telegram.org https://t.me",
  );
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(req.method === "HEAD" ? "" : '{"status":"ok"}');
    return;
  }
  if (base !== "/" && pathname === base.slice(0, -1)) {
    res.writeHead(308, { Location: base });
    res.end();
    return;
  }
  if (!pathname.startsWith(base)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const relative = pathname.slice(base.length) || "index.html";
  if (
    relative.split("/").some((p) => p.startsWith(".")) ||
    relative.includes("\0") ||
    relative.includes("\\")
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  const file = resolve(root, relative);
  if (!file.startsWith(root + sep)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": relative.startsWith("assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(
    `Cranium static server listening on port ${port}, base path ${base}`,
  ),
);
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => server.close(() => process.exit(0)));
