/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'

import {createWaveBlob} from '../../supertonic/wav'
import {compressLegacyWave} from '../compress-legacy-wave'

const opusMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../../supertonic/opus-client', () => ({createOpusBlob: opusMocks.create}))

beforeEach(() => {
  vi.clearAllMocks()
  opusMocks.create.mockResolvedValue(new Blob(['opus'], {type: 'audio/ogg; codecs=opus'}))
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

it('should reject unsupported legacy audio', async () => {
  await expect(compressLegacyWave(new Blob(['not a wave']))).rejects.toThrow(
    'Expected RIFF WAVE audio.',
  )
})
