// oxlint-disable no-magic-numbers -- WAV uses fixed binary field sizes and PCM format identifiers.
import {createOpusBlob} from '../supertonic/opus-client'

interface WavePcm {
  readonly sampleRate: number
  readonly samples: Float32Array
}

const readText = (data: Uint8Array, offset: number, length: number) =>
  new TextDecoder().decode(data.subarray(offset, offset + length))

const readBlob = (blob: Blob) => {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(new Error('Failed to read legacy WAV audio.')))
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Expected legacy WAV audio as an ArrayBuffer.'))
      }
    })
    reader.readAsArrayBuffer(blob)
  })
}

const parseWavePcm = (buffer: ArrayBuffer): WavePcm => {
  const data = new Uint8Array(buffer)
  const view = new DataView(buffer)

  if (data.length < 44 || readText(data, 0, 4) !== 'RIFF' || readText(data, 8, 4) !== 'WAVE') {
    throw new Error('Expected RIFF WAVE audio.')
  }

  let audioFormat: number | null = null
  let bitsPerSample: number | null = null
  let channelCount: number | null = null
  let sampleRate: number | null = null
  let pcmOffset: number | null = null
  let pcmLength: number | null = null
  let chunkOffset = 12

  while (chunkOffset + 8 <= data.length) {
    const chunkId = readText(data, chunkOffset, 4)
    const chunkLength = view.getUint32(chunkOffset + 4, true)
    const chunkDataOffset = chunkOffset + 8

    if (chunkDataOffset + chunkLength > data.length) {
      throw new Error('Legacy WAV contains an incomplete chunk.')
    }

    if (chunkId === 'fmt ' && chunkLength >= 16) {
      audioFormat = view.getUint16(chunkDataOffset, true)
      channelCount = view.getUint16(chunkDataOffset + 2, true)
      sampleRate = view.getUint32(chunkDataOffset + 4, true)
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true)
    }

    if (chunkId === 'data') {
      pcmOffset = chunkDataOffset
      pcmLength = chunkLength
    }

    chunkOffset = chunkDataOffset + chunkLength + (chunkLength % 2)
  }

  if (
    audioFormat !== 1 ||
    channelCount !== 1 ||
    bitsPerSample !== 16 ||
    sampleRate === null ||
    pcmOffset === null ||
    pcmLength === null
  ) {
    throw new Error('Only mono 16-bit PCM WAV audio can be migrated.')
  }

  const sampleCount = Math.floor(pcmLength / 2)
  const samples = new Float32Array(sampleCount)

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = view.getInt16(pcmOffset + index * 2, true)
    samples[index] = sample < 0 ? sample / 32_768 : sample / 32_767
  }

  return {sampleRate, samples}
}

/** Converts Pomo's legacy mono PCM WAV cache entry into Ogg Opus. */
export const compressLegacyWave = async (audio: Blob): Promise<Blob> => {
  const wave = parseWavePcm(await readBlob(audio))
  return createOpusBlob({sampleRate: wave.sampleRate, samples: wave.samples})
}
