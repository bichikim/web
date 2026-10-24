import {expect, test} from 'vitest'
import {readMoc3} from '../read-moc3'

const emptyModel = (bigEndian = false) => {
  const bytes = new Uint8Array(1536)
  bytes.set([77, 79, 67, 51, 4, Number(bigEndian)])
  const view = new DataView(bytes.buffer)
  view.setUint32(64, 1024, !bigEndian)
  view.setUint32(68, 1280, !bigEndian)
  ;[100, 50, 75, 100, 150].forEach((value, index) => {
    view.setFloat32(1280 + index * 4, value, !bigEndian)
  })
  return bytes
}

test.each([false, true])('should read canvas and empty tables with big endian=%s', (bigEndian) => {
  const model = readMoc3(emptyModel(bigEndian))
  expect(model.canvas).toEqual({
    height: 150,
    originX: 50,
    originY: 75,
    pixelsPerUnit: 100,
    reverseY: false,
    width: 100,
  })
  expect(model.counts.artMeshes).toBe(0)
})

test.each([1, 2, 3, 4, 5, 6])(
  'should read version %s table layout without consuming reserved bytes as tables',
  (version) => {
    const bytes = emptyModel()
    bytes[4] = version
    expect(readMoc3(bytes).version).toBe(version)
    expect(readMoc3(bytes).tables.artMeshes?.ids).toEqual([])
  },
)

test('should reject unknown versions instead of treating them as older models', () => {
  const bytes = emptyModel()
  bytes[4] = 255
  expect(() => readMoc3(bytes)).toThrow(/version/i)
})

test('should reject invalid magic and truncated headers', () => {
  expect(() => readMoc3(new Uint8Array(12))).toThrow(/MOC3/)
  const bytes = emptyModel()
  bytes[0] = 0
  expect(() => readMoc3(bytes)).toThrow(/MOC3/)
})

test('should validate table bounds before allocating from untrusted counts', () => {
  const bytes = emptyModel()
  new DataView(bytes.buffer).setUint32(1024 + 4 * 4, 0xffffffff, true)
  expect(() => readMoc3(bytes)).toThrow(/bounds|count/i)
})

test('should respect the source byte offset and leave input unchanged', () => {
  const bytes = emptyModel()
  const padded = new Uint8Array(bytes.length + 16)
  padded.set(bytes, 8)
  expect(readMoc3(padded.subarray(8, -8)).canvas.width).toBe(100)
  expect(padded.subarray(8, -8)).toEqual(bytes)
})
