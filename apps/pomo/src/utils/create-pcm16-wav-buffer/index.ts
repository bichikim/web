// oxlint-disable no-magic-numbers -- RIFF/PCM16 header fields use fixed offsets and format values.
export const PCM16_WAV_HEADER_BYTES = 44

export interface CreatePcm16WavBufferOptions {
  /** Number of interleaved PCM channels, supplied by the encoding policy. */
  readonly channels: number
  /** Payload size in bytes; the returned payload is zero-filled and caller-owned. */
  readonly dataBytes: number
  /** Sample rate written using native DataView integer conversion; validation belongs to the caller. */
  readonly sampleRate: number
}

/** Allocates a PCM16 RIFF/WAVE buffer and writes its header, leaving sample conversion to the caller. */
export const createPcm16WavBuffer = (options: CreatePcm16WavBufferOptions): ArrayBuffer => {
  const {channels, dataBytes, sampleRate} = options
  const frameBytes = channels * 2
  const buffer = new ArrayBuffer(PCM16_WAV_HEADER_BYTES + dataBytes)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const encoder = new TextEncoder()
  encoder.encodeInto('RIFF', bytes.subarray(0, 4))
  view.setUint32(4, buffer.byteLength - 8, true)
  encoder.encodeInto('WAVE', bytes.subarray(8, 12))
  encoder.encodeInto('fmt ', bytes.subarray(12, 16))
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * frameBytes, true)
  view.setUint16(32, frameBytes, true)
  view.setUint16(34, 16, true)
  encoder.encodeInto('data', bytes.subarray(36, 40))
  view.setUint32(40, dataBytes, true)
  return buffer
}
