// Test-only static hosting for the production PWA; no application API or backend.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('client/dist/streakly/browser');
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!path.startsWith(root + '/') && path !== root) {
        res.writeHead(403).end();
        return;
      }
      if (!extname(path)) path = resolve(root, 'index.html');
      const file = await readFile(path);
      res.writeHead(200, {
        'Content-Type': types[extname(path)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(file);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(4201, '127.0.0.1');
