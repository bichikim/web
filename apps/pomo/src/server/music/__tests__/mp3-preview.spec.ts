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

const concatenate = (...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const bytes = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0))
  let offset = 0

  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }

  return bytes
}

const createCustomMp3 = (
  header: readonly number[],
  frameBytes: number,
  frameCount: number,
): Uint8Array => {
  const bytes = new Uint8Array(frameBytes * frameCount)

  for (let index = 0; index < frameCount; index += 1) {
    bytes.set(header, index * frameBytes)
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

describe('MP3 header boundaries', () => {
  it.each([Number.NaN, 0])('should reject invalid preview duration %s', (durationMs) => {
    expect(() => extractMp3Preview(createMp3(3), durationMs)).toThrow('invalid_preview_duration')
  })

  it.each([
    ['a non-ID3 first byte', [0x00, 0x44, 0x33]],
    ['a non-ID3 second byte', [0x49, 0x00, 0x33]],
    ['a non-ID3 third byte', [0x49, 0x44, 0x00]],
  ] as const)('should scan audio after %s', (_name, prefix) => {
    const result = extractMp3Preview(
      concatenate(new Uint8Array(prefix), createMp3(3)),
      Math.ceil(FRAME_DURATION_MS),
    )

    expect(result.byteLength).toBe(FRAME_BYTES)
  })

  it('should reject a truncated ID3 header', () => {
    expect(() => extractMp3Preview(new Uint8Array([0x49, 0x44, 0x33, 0x04]), 1000)).toThrow(
      'invalid_mp3_id3',
    )
  })

  it('should reject a non-synchsafe ID3 size', () => {
    const id3 = new Uint8Array(10)
    id3.set([0x49, 0x44, 0x33, 0x04, 0, 0, 0x80, 0, 0, 0])

    expect(() => extractMp3Preview(id3, 1000)).toThrow('invalid_mp3_id3')
  })

  it('should reject an ID3 body beyond the available input', () => {
    const id3 = new Uint8Array(10)
    id3.set([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 1])

    expect(() => extractMp3Preview(id3, 1000)).toThrow('invalid_mp3_id3')
  })

  it('should reject ID3 metadata beyond the maximum size', () => {
    const id3 = new Uint8Array(10)
    id3.set([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0x20, 0, 0])

    expect(() => extractMp3Preview(id3, 1000)).toThrow('invalid_mp3_id3')
  })

  it('should skip an ID3 footer before scanning frames', () => {
    const id3 = new Uint8Array(20)
    id3.set([0x49, 0x44, 0x33, 0x04, 0, 0x10, 0, 0, 0, 0])

    const result = extractMp3Preview(concatenate(id3, createMp3(3)), Math.ceil(FRAME_DURATION_MS))

    expect(result.byteLength).toBe(FRAME_BYTES)
  })

  it.each([
    ['a non-layer-3 frame', [0xff, 0xfd, 0x90, 0]],
    ['a reserved MPEG version', [0xff, 0xeb, 0x90, 0]],
    ['a free bitrate', [0xff, 0xfb, 0x00, 0]],
    ['a forbidden bitrate', [0xff, 0xfb, 0xf0, 0]],
    ['a forbidden sample rate', [0xff, 0xfb, 0x9c, 0]],
  ] as const)('should skip %s before valid consecutive frames', (_name, header) => {
    const malformed = new Uint8Array(FRAME_BYTES)
    malformed.set(header)

    const result = extractMp3Preview(
      concatenate(malformed, createMp3(3)),
      Math.ceil(FRAME_DURATION_MS),
    )

    expect(result.byteLength).toBe(FRAME_BYTES)
  })

  it('should support MPEG 2 layer 3 frames', () => {
    const frameBytes = 261
    const frameDurationMs = (576 * 1000) / 22_050
    const source = createCustomMp3([0xff, 0xf3, 0x90, 0], frameBytes, 3)

    const result = extractMp3Preview(source, Math.ceil(frameDurationMs))

    expect(result.byteLength).toBe(frameBytes)
  })

  it('should support padded MPEG 2.5 layer 3 frames', () => {
    const frameBytes = 523
    const frameDurationMs = (576 * 1000) / 11_025
    const source = createCustomMp3([0xff, 0xe3, 0x92, 0], frameBytes, 3)

    const result = extractMp3Preview(source, Math.ceil(frameDurationMs))

    expect(result.byteLength).toBe(frameBytes)
  })

  it('should skip a lone valid frame before consecutive frames', () => {
    const loneFrame = createFrame()
    const gap = new Uint8Array(FRAME_BYTES)

    const result = extractMp3Preview(
      concatenate(loneFrame, gap, createMp3(3)),
      Math.ceil(FRAME_DURATION_MS),
    )

    expect(result.byteLength).toBe(FRAME_BYTES)
  })

  it.each([
    ['a missing second header byte', new Uint8Array([0xff])],
    ['a missing third header byte', new Uint8Array([0xff, 0xfb])],
    ['a truncated complete-frame header', new Uint8Array([0xff, 0xfb, 0x90, 0])],
  ] as const)('should stop before %s at the tail', (_name, tail) => {
    const result = extractMp3Preview(
      concatenate(createMp3(2), tail),
      Math.ceil(FRAME_DURATION_MS * 3),
    )

    expect(result.byteLength).toBe(FRAME_BYTES * 2)
  })

  it('should reject a maximum duration shorter than one frame', () => {
    expect(() => extractMp3Preview(createMp3(3), 1)).toThrow('invalid_mp3_frames')
  })
})

describe('VBR header rewriting', () => {
  it('should rewrite an Info TOC in the first frame', () => {
    const source = createMp3(3)
    const markerOffset = 32
    source.set([0x49, 0x6e, 0x66, 0x6f, 0, 0, 0, 0x04], markerOffset)

    const result = extractMp3Preview(source, Math.ceil(FRAME_DURATION_MS))

    expect(Array.from(result.slice(markerOffset + 8, markerOffset + 108))).toEqual(
      Array.from({length: 100}, (_value, index) => Math.floor((index * 256) / 100)),
    )
  })

  it('should leave disabled Xing fields unchanged', () => {
    const source = createMp3(3)
    const markerOffset = 32
    source.set([0x58, 0x69, 0x6e, 0x67, 0, 0, 0, 0], markerOffset)

    const result = extractMp3Preview(source, Math.ceil(FRAME_DURATION_MS))

    expect(new DataView(result.buffer).getUint32(markerOffset + 8)).toBe(0)
  })

  it('should rewrite VBRI byte and frame counts', () => {
    const source = createMp3(3)
    const markerOffset = 32
    source.set([0x56, 0x42, 0x52, 0x49], markerOffset)

    const result = extractMp3Preview(source, Math.ceil(FRAME_DURATION_MS))
    const view = new DataView(result.buffer)

    expect(view.getUint32(markerOffset + 10)).toBe(result.byteLength)
    expect(view.getUint32(markerOffset + 14)).toBe(1)
  })

  it.each([
    ['a truncated Xing header', 'Xing', 20],
    ['a truncated VBRI header', 'VBRI', 12],
  ] as const)('should ignore %s', (_name, marker, markerOffset) => {
    const header = [0xff, 0xf3, 0x10, 0]
    const source = createCustomMp3(header, 26, 3)
    source.set(
      [...marker].map((character) => character.codePointAt(0) ?? 0),
      markerOffset,
    )

    expect(() => extractMp3Preview(source, 30)).not.toThrow()
  })
})
