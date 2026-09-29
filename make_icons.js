#!/usr/bin/env node
// ============================================================================
// make_icons.js — generate the PWA icon PNGs from code. SOURCE OF TRUTH for
// PWA/icons/*.png: the pixels are GENERATED, never hand-edited. Re-run via
// `bash build_pwa.sh` (which calls this) if the artwork below changes.
//
// No image library: a minimal PNG encoder (zlib is built in) plus a supersampled
// rasteriser. Deterministic — identical bytes on every run, so build_pwa.sh --check
// can treat the icons like any other generated region.
//
// Artwork = the game's own subject: a part-part-whole NUMBER BOND on the game's
// background navy (#0a1a3a), whole in mint (#40ffcc, the shell's accent), parts in
// cyan (#00b8d4). Readable at 48px; no text (nothing to rasterise, nothing to
// translate).
// ============================================================================
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
// rgba: Buffer of w*h*4. Colour type 6 (RGBA), 8-bit, filter 0 on every scanline.
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- artwork (unit square 0..1, rasterised with SS x supersampling) --------
const SS = 4;
const NAVY   = [0x0a, 0x1a, 0x3a];
const NAVY_HI = [0x14, 0x30, 0x62]; // centre of the background glow
const MINT   = [0x40, 0xff, 0xcc];
const CYAN   = [0x00, 0xb8, 0xd4];

const WHOLE = { x: 0.50, y: 0.29, r: 0.150 };
const PARTS = [{ x: 0.275, y: 0.715, r: 0.130 }, { x: 0.725, y: 0.715, r: 0.130 }];
const STROKE = 0.036; // half-width of the connector bars

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// Colour of the ARTWORK at unit point (u,v), or null for "background".
function inkAt(u, v) {
  for (const p of PARTS) {
    if (Math.hypot(u - p.x, v - p.y) <= p.r) return CYAN;
    if (distSeg(u, v, WHOLE.x, WHOLE.y, p.x, p.y) <= STROKE) return MINT;
  }
  if (Math.hypot(u - WHOLE.x, v - WHOLE.y) <= WHOLE.r) return MINT;
  return null;
}
// Background: soft radial glow, navy -> lighter navy at centre.
function bgAt(u, v) {
  const d = Math.min(1, Math.hypot(u - 0.5, v - 0.5) / 0.72);
  const k = (1 - d) * (1 - d);
  return [
    Math.round(NAVY[0] + (NAVY_HI[0] - NAVY[0]) * k),
    Math.round(NAVY[1] + (NAVY_HI[1] - NAVY[1]) * k),
    Math.round(NAVY[2] + (NAVY_HI[2] - NAVY[2]) * k),
  ];
}

// scale: shrink the artwork about the centre (maskable icons must keep their
// content inside the centre 80% safe zone; the BACKGROUND still fills the tile).
function render(size, scale) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const bg = bgAt(u, v);
          const ink = inkAt(0.5 + (u - 0.5) / scale, 0.5 + (v - 0.5) / scale);
          const c = ink || bg;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n); rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n); rgba[i + 3] = 255; // fully opaque: iOS
      // composites apple-touch-icon over black, and maskable tiles must not gap.
    }
  }
  return encodePNG(size, size, rgba);
}

const OUT = path.join(__dirname, 'icons');
fs.mkdirSync(OUT, { recursive: true });
const JOBS = [
  ['icon-192.png',           192, 1.00],
  ['icon-512.png',           512, 1.00],
  ['icon-192-maskable.png',  192, 0.78],
  ['icon-512-maskable.png',  512, 0.78],
  ['apple-touch-icon-180.png', 180, 0.86], // iOS rounds the corners itself
];
for (const [name, size, scale] of JOBS) {
  const buf = render(size, scale);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  icons/${name}  ${size}x${size}  ${buf.length} bytes`);
}
