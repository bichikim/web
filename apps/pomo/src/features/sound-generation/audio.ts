// oxlint-disable no-magic-numbers -- Fixed PCM header fields and the official SA3 LogSNR schedule.
export function createSchedule(steps: number): number[] {
  return Array.from({length: steps + 1}, (_, index) => {
    if (index === 0) {
      return 1
    }
    if (index === steps) {
      return 0
    }
    const time = 1 - index / steps
    return 1 / (1 + Math.exp(2 - time * 8.2))
  })
}

export function createNoise(length: number): Float32Array {
  const noise = new Float32Array(length)
  for (let index = 0; index < length; index += 2) {
    const radius = Math.sqrt(-2 * Math.log(1 - Math.random()))
    const angle = 2 * Math.PI * Math.random()
    noise[index] = radius * Math.cos(angle)
    if (index + 1 < length) {
      noise[index + 1] = radius * Math.sin(angle)
    }
  }
  return noise
}

/** Encodes interleaved signed PCM from the official SAME-S decoder as a stereo WAV. */
export function createStereoWave(pcm: Int32Array, frames: number): Blob {
  if (pcm.length < frames * 2) {
    throw new Error('Decoder output is shorter than requested')
  }
  const buffer = new ArrayBuffer(44 + frames * 4)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  text(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, 44100, true)
  view.setUint32(28, 176400, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * 4, true)
  for (let index = 0; index < frames * 2; index += 1) {
    view.setInt16(44 + index * 2, Math.max(-32768, Math.min(32767, pcm[index])), true)
  }
  return new Blob([buffer], {type: 'audio/wav'})
}
