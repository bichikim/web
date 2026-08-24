import {describe, expect, it} from 'vitest'

import {extractMp3Preview} from '../mp3-preview'

const FRAME_BYTES = 417
const FRAME_DURATION_MS = (1152 * 1000) / 44_100

const createFrame = (): Uint8Array => {
  const frame = new Uint8Array(FRAME_BYTES)
  frame.set([0xff, 0xfb, 0x90, 0x00])
  return frame
}

const createMp3 = (frameCount: number): Uint8Array => {
  const bytes = new Uint8Array(FRAME_BYTES * frameCount)

  for (let index = 0; index < frameCount; index += 1) {
    bytes.set(createFrame(), index * FRAME_BYTES)
  }

  return bytes
}

describe('extractMp3Preview', () => {
  it('should end on the last complete frame within the maximum duration', () => {
    const maximumDurationMs = 30_000
    const expectedFrames = Math.floor(maximumDurationMs / FRAME_DURATION_MS)
    const result = extractMp3Preview(createMp3(1200), maximumDurationMs)

    expect(result.byteLength).toBe(expectedFrames * FRAME_BYTES)
    expect(expectedFrames * FRAME_DURATION_MS).toBeLessThanOrEqual(maximumDurationMs)
    expect((expectedFrames + 1) * FRAME_DURATION_MS).toBeGreaterThan(maximumDurationMs)
  })

  it('should strip source ID3 metadata from the public preview', () => {
    const id3 = new Uint8Array(14)
    id3.set([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04])
    const mp3 = createMp3(3)
    const source = new Uint8Array(id3.byteLength + mp3.byteLength)
    source.set(id3)
    source.set(mp3, id3.byteLength)

    const result = extractMp3Preview(source, Math.ceil(FRAME_DURATION_MS * 2))

    expect(result.byteLength).toBe(FRAME_BYTES * 2)
    expect(Array.from(result.slice(0, 4))).toEqual([0xff, 0xfb, 0x90, 0x00])
  })

  it('should rewrite the Xing frame count to the bounded preview frame count', () => {
    const source = createMp3(1200)
    const markerOffset = 32
    source.set([0x58, 0x69, 0x6e, 0x67, 0x00, 0x00, 0x00, 0x03], markerOffset)
    new DataView(source.buffer).setUint32(markerOffset + 8, 1200)
    new DataView(source.buffer).setUint32(markerOffset + 12, source.byteLength)

    const result = extractMp3Preview(source, 30_000)
    const expectedFrames = Math.floor(30_000 / FRAME_DURATION_MS)
    const resultView = new DataView(result.buffer)

    expect(resultView.getUint32(markerOffset + 8)).toBe(expectedFrames)
    expect(resultView.getUint32(markerOffset + 12)).toBe(result.byteLength)
  })

  it('should reject malformed input without consecutive MPEG layer 3 frames', () => {
    expect(() => extractMp3Preview(new Uint8Array(1024), 30_000)).toThrow('invalid_mp3_frames')
  })
})
