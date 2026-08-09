// oxlint-disable no-magic-numbers -- These constants are fixed offsets and ranges in the PCM WAV specification.
export const createWaveBlob = (samples: Float32Array, sampleRate: number) => {
  const headerSize = 44
  const buffer = new ArrayBuffer(headerSize + samples.length * 2)
  const view = new DataView(buffer)

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(headerSize + index * 2, sample < 0 ? sample * 32_768 : sample * 32_767, true)
  }

  return new Blob([buffer], {type: 'audio/wav'})
}
