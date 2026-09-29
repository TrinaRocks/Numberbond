#!/usr/bin/env node
// ============================================================================
// serve.js — throwaway local server for TESTING the PWA. Not part of the build,
// not shipped. A service worker needs a SECURE CONTEXT: https, or localhost.
// Opening index.html from file:// silently gives you no service worker (the game
// still runs — the PWA layer is fail-silent — but nothing installs or caches).
//
//   node PWA/serve.js            -> http://127.0.0.1:8181
//   node PWA/serve.js 9000       -> http://127.0.0.1:9000
//
// Sends no-store on everything, so the browser's HTTP cache can never be mistaken
// for the service-worker cache while testing.
// ============================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8181;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  // Split on '/' and drop empties and dot-segments — no path traversal, and no
  // backslash literals in this file (the shell harness eats them; CLAUDE.md item 4).
  const parts = rel.split('/').filter((s) => s && s !== '.' && s !== '..');
  if (parts.length === 0) parts.push('index.html');
  const file = path.join(ROOT, ...parts);
  fs.readFile(file, (err, buf) => {
    if (err) {
      console.log(`  404 ${rel}`);
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    console.log(`  200 ${rel} (${buf.length}b)`);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(buf);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`PWA test server: http://127.0.0.1:${PORT}   (Ctrl+C to stop)`);
});
