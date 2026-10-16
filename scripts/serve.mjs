// Servidor estático local, sin dependencias. Uso: npm run dev
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

http
  .createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = resolve(join(root, path));
      if (file !== root && !file.startsWith(root + sep)) return res.writeHead(403).end();
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) {
        if (!path.endsWith('/')) return res.writeHead(301, { Location: `${path}/` }).end();
        file = join(file, 'index.html');
        info = await stat(file).catch(() => null);
      }
      if (!info) return res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  })
  .listen(port, () => console.log(`Umbral en http://localhost:${port}`));
