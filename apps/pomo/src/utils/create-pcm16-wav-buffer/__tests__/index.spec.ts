/** @vitest-environment node */
// oxlint-disable no-magic-numbers -- RIFF/PCM16 fields are checked against fixed format bytes.
import {describe, expect, it} from 'vitest'
import {createPcm16WavBuffer, PCM16_WAV_HEADER_BYTES} from '..'

describe('createPcm16WavBuffer', () => {
  it('should allocate a stereo PCM16 buffer with the canonical little-endian header', () => {
    const buffer = createPcm16WavBuffer({channels: 2, dataBytes: 8, sampleRate: 44100})
    expect(new Uint8Array(buffer)).toEqual(
      Uint8Array.of(
        0x52,
        0x49,
        0x46,
        0x46,
        44,
        0,
        0,
        0,
        0x57,
        0x41,
        0x56,
        0x45,
        0x66,
        0x6d,
        0x74,
        0x20,
        16,
        0,
        0,
        0,
        1,
        0,
        2,
        0,
        0x44,
        0xac,
        0,
        0,
        0x10,
        0xb1,
        2,
        0,
        4,
        0,
        16,
        0,
        0x64,
        0x61,
        0x74,
        0x61,
        8,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    )
  })

  it('should represent an empty mono payload independently of sample-rate validation', () => {
    const buffer = createPcm16WavBuffer({channels: 1, dataBytes: 0, sampleRate: 0})
    const view = new DataView(buffer)
    expect(buffer.byteLength).toBe(PCM16_WAV_HEADER_BYTES)
    expect(view.getUint32(4, true)).toBe(36)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(0)
    expect(view.getUint32(28, true)).toBe(0)
    expect(view.getUint16(32, true)).toBe(2)
    expect(view.getUint32(40, true)).toBe(0)
  })

  it.each([8000, 16000, 24000, 44100, 48000])(
    'should derive mono byte rate at %i Hz',
    (sampleRate) => {
      const buffer = createPcm16WavBuffer({channels: 1, dataBytes: 6, sampleRate})
      const view = new DataView(buffer)
      expect(view.getUint32(24, true)).toBe(sampleRate)
      expect(view.getUint32(28, true)).toBe(sampleRate * 2)
      expect(view.getUint16(32, true)).toBe(2)
      expect(view.getUint32(40, true)).toBe(6)
      expect(buffer.byteLength).toBe(50)
    },
  )

  it('should return independently writable payload storage without altering the header', () => {
    const options = {channels: 2, dataBytes: 4, sampleRate: 44100}
    const first = new Uint8Array(createPcm16WavBuffer(options))
    const second = new Uint8Array(createPcm16WavBuffer(options))
    first.set([1, 2, 3, 4], PCM16_WAV_HEADER_BYTES)
    expect(first.slice(0, PCM16_WAV_HEADER_BYTES)).toEqual(second.slice(0, PCM16_WAV_HEADER_BYTES))
    expect(second.slice(PCM16_WAV_HEADER_BYTES)).toEqual(Uint8Array.of(0, 0, 0, 0))
  })
})
