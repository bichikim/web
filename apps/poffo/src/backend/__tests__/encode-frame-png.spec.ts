import {expect, test} from 'vitest'
import {PNG} from 'pngjs'
import {encodeFramePng} from '../encode-frame-png'

test('should encode bottom-up premultiplied GPU bytes as top-down straight RGBA', () => {
  const pixels = Uint8Array.of(1, 2, 3, 255, 7, 8, 9, 0, 1, 0, 2, 2, 64, 32, 16, 128)
  const original = pixels.slice()
  const encoded = encodeFramePng({height: 2, pixels, width: 2})
  const decoded = PNG.sync.read(Buffer.from(encoded))
  expect(decoded.width).toBe(2)
  expect(decoded.height).toBe(2)
  expect(Array.from(decoded.data)).toEqual([
    128, 0, 255, 2, 128, 64, 32, 128, 1, 2, 3, 255, 0, 0, 0, 0,
  ])
  expect(pixels).toEqual(original)
})

test('should preserve every valid premultiplied byte after a PNG round trip', () => {
  const side = 256
  const channels = 4
  const maximum = 255
  const pixels = new Uint8Array(side * side * channels)
  for (let alpha = 0; alpha < side; alpha += 1) {
    for (let color = 0; color < side; color += 1) {
      const offset = (alpha * side + color) * channels
      pixels.set([Math.min(alpha, color), 0, Math.min(alpha, maximum - color), alpha], offset)
    }
  }
  const decoded = PNG.sync.read(Buffer.from(encodeFramePng({height: side, pixels, width: side})))
  const reconstructed = new Uint8Array(pixels.length)
  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const source = ((side - 1 - row) * side + column) * channels
      const destination = (row * side + column) * channels
      const alpha = decoded.data[source + 3]!
      reconstructed.set(
        [
          Math.round((decoded.data[source]! * alpha) / maximum),
          0,
          Math.round((decoded.data[source + 2]! * alpha) / maximum),
          alpha,
        ],
        destination,
      )
    }
  }
  expect(Buffer.compare(Buffer.from(reconstructed), Buffer.from(pixels))).toBe(0)
})

test('should clamp emissive RGB to the representable straight-alpha range', () => {
  const encoded = encodeFramePng({height: 1, pixels: Uint8Array.of(255, 3, 0, 2), width: 1})
  expect(Array.from(PNG.sync.read(Buffer.from(encoded)).data)).toEqual([255, 255, 0, 2])
})

test.each([
  {height: 1, pixels: new Uint8Array(4), width: 0},
  {height: -1, pixels: new Uint8Array(4), width: 1},
  {height: 1, pixels: new Uint8Array(4), width: 1.5},
  {height: 1, pixels: new Uint8Array(3), width: 1},
])('should reject invalid frame dimensions and byte counts: %j', (frame) => {
  expect(() => encodeFramePng(frame)).toThrow(RangeError)
})
