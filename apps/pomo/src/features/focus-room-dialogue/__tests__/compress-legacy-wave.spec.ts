/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createWaveBlob} from '../../supertonic/wav'
import {compressLegacyWave} from '../compress-legacy-wave'

const opusMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../../supertonic/opus-client', () => ({createOpusBlob: opusMocks.create}))

const readTestBlob = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(new Error('Failed to read test WAV audio.')))
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Expected test WAV audio as an ArrayBuffer.'))
      }
    })
    reader.readAsArrayBuffer(blob)
  })

const writeText = (data: Uint8Array, offset: number, text: string) => {
  data.set(new TextEncoder().encode(text), offset)
}

beforeEach(() => {
  vi.clearAllMocks()
  opusMocks.create.mockResolvedValue(new Blob(['opus'], {type: 'audio/ogg; codecs=opus'}))
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should convert legacy mono PCM WAV samples to Opus', async () => {
  const wave = createWaveBlob(Float32Array.of(-1, -0.5, 0, 0.5, 1), 24_000)
  const opus = await compressLegacyWave(wave)

  expect(opus.type).toBe('audio/ogg; codecs=opus')
  expect(opusMocks.create).toHaveBeenCalledWith({
    sampleRate: 24_000,
    samples: expect.objectContaining({0: -1, 2: 0, 4: 1}),
  })
})

it('should pass legacy browser 44.1 kHz WAV audio to the Opus Worker', async () => {
  const wave = createWaveBlob(new Float32Array(44_100).fill(0.25), 44_100)

  await compressLegacyWave(wave)

  expect(opusMocks.create).toHaveBeenCalledWith({
    sampleRate: 44_100,
    samples: expect.any(Float32Array),
  })
})

it('should read a legacy WAV through Blob arrayBuffer when available', async () => {
  const wave = createWaveBlob(Float32Array.of(0.25), 24_000)
  const buffer = await readTestBlob(wave)
  const arrayBuffer = vi.fn().mockResolvedValue(buffer)
  Object.defineProperty(wave, 'arrayBuffer', {value: arrayBuffer})

  await compressLegacyWave(wave)

  expect(arrayBuffer).toHaveBeenCalledOnce()
  expect(opusMocks.create).toHaveBeenCalledOnce()
})

it('should reject when FileReader cannot read the legacy WAV', async () => {
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(
    function dispatchError(this: FileReader) {
      this.dispatchEvent(new ProgressEvent('error'))
    },
  )

  await expect(compressLegacyWave(new Blob(['wave']))).rejects.toThrow(
    'Failed to read legacy WAV audio.',
  )
})

it('should reject when FileReader returns a non-buffer result', async () => {
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(
    function dispatchLoad(this: FileReader) {
      this.dispatchEvent(new ProgressEvent('load'))
    },
  )

  await expect(compressLegacyWave(new Blob(['wave']))).rejects.toThrow(
    'Expected legacy WAV audio as an ArrayBuffer.',
  )
})

it('should reject an incomplete WAV chunk', async () => {
  const buffer = new ArrayBuffer(44)
  const data = new Uint8Array(buffer)
  const view = new DataView(buffer)
  writeText(data, 0, 'RIFF')
  writeText(data, 8, 'WAVE')
  writeText(data, 12, 'data')
  view.setUint32(16, 100, true)

  await expect(compressLegacyWave(new Blob([buffer]))).rejects.toThrow(
    'Legacy WAV contains an incomplete chunk.',
  )
})

it('should reject a stereo PCM WAV', async () => {
  const buffer = await readTestBlob(createWaveBlob(Float32Array.of(0.25), 24_000))
  new DataView(buffer).setUint16(22, 2, true)

  await expect(compressLegacyWave(new Blob([buffer]))).rejects.toThrow(
    'Only mono 16-bit PCM WAV audio can be migrated.',
  )
})

it('should reject unsupported legacy audio', async () => {
  await expect(compressLegacyWave(new Blob(['not a wave']))).rejects.toThrow(
    'Expected RIFF WAVE audio.',
  )
})
