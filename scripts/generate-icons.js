#!/usr/bin/env node
/**
 * Generates minimal valid PNG icons for PWA.
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (~crc) >>> 0
}

function uint32BE(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = uint32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = uint32BE(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crc])
}

function createPNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // IDAT: raw scanlines with filter byte 0
  const scanline = Buffer.alloc(1 + size * 3)
  scanline[0] = 0 // filter none
  for (let x = 0; x < size; x++) {
    scanline[1 + x * 3] = r
    scanline[2 + x * 3] = g
    scanline[3 + x * 3] = b
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => scanline))
  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// Green #3fb950 = rgb(63, 185, 80)
const png192 = createPNG(192, 63, 185, 80)
const png512 = createPNG(512, 63, 185, 80)

fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192)
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512)

console.log('Icons generated: public/icons/icon-192.png, public/icons/icon-512.png')
