import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw pixel data: each row starts with filter byte 0
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  // Background color #25D366 (37, 211, 102, 255)
  // Border: 2px black #000000
  const bgR = 37, bgG = 211, bgB = 102;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rect border check
      const radius = width * 0.18;
      const borderThick = Math.max(3, Math.round(width * 0.04));

      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);

      let isInside = true;
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(radius - dx, radius - dy);
        if (dist > radius) isInside = false;
      }

      if (!isInside) {
        // Transparent
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
      } else {
        // Check if on border
        let isBorder = false;
        if (x < borderThick || x >= width - borderThick || y < borderThick || y >= height - borderThick) {
          isBorder = true;
        } else if (dx < radius && dy < radius) {
          const dist = Math.hypot(radius - dx, radius - dy);
          if (dist > radius - borderThick) isBorder = true;
        }

        // Draw central speech circle / icon shape
        const cx = width / 2;
        const cy = height / 2;
        const cDist = Math.hypot(x - cx, y - cy);
        const iconRadius = width * 0.32;

        if (isBorder) {
          raw[pxOffset] = 0;
          raw[pxOffset + 1] = 0;
          raw[pxOffset + 2] = 0;
          raw[pxOffset + 3] = 255;
        } else if (cDist < iconRadius && cDist > iconRadius - borderThick) {
          // White bubble border
          raw[pxOffset] = 0;
          raw[pxOffset + 1] = 0;
          raw[pxOffset + 2] = 0;
          raw[pxOffset + 3] = 255;
        } else if (cDist < iconRadius - borderThick) {
          // Inside bubble: White
          raw[pxOffset] = 255;
          raw[pxOffset + 1] = 255;
          raw[pxOffset + 2] = 255;
          raw[pxOffset + 3] = 255;
        } else {
          // Green background
          raw[pxOffset] = bgR;
          raw[pxOffset + 1] = bgG;
          raw[pxOffset + 2] = bgB;
          raw[pxOffset + 3] = 255;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1);
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180));
console.log('PNG icons generated successfully in public/');
