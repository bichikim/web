import {describe, expect, it} from 'vitest'

import {
  createPAudioEnvelope,
  createPVisemeDriver,
  createPWaveEnvelope,
  getPAudioEnvelopeLevel,
} from '../audio-driven-viseme'

const writeText = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

const createRiffBuffer = (byteLength: number) => {
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)
  writeText(view, 0, 'RIFF')
  writeText(view, 8, 'WAVE')
  return {buffer, view}
}

describe('createPAudioEnvelope', () => {
  it('should return an empty envelope for an invalid sample rate or empty samples', () => {
    expect(createPAudioEnvelope({sampleRate: 0, samples: Float32Array.of(1)})).toEqual({
      frameDurationMs: 20,
      levels: [],
    })
    expect(createPAudioEnvelope({sampleRate: 1_000, samples: new Float32Array()})).toEqual({
      frameDurationMs: 20,
      levels: [],
    })
  })

  it('should normalize a missing runtime sample through the silence fallback', () => {
    const samples = {length: 1} as unknown as Float32Array

    expect(createPAudioEnvelope({sampleRate: 1_000, samples}).levels).toEqual([0])
  })

  it('should treat an empty runtime RMS window and level collection as silence', () => {
    const windowLengths = [1, 1, 0, 0]
    const windowSamples = Object.defineProperty({}, 'length', {
      get: () => windowLengths.shift() ?? 0,
    }) as Float32Array
    const emptyLevels = {length: -1} as unknown as Float32Array

    expect(createPAudioEnvelope({sampleRate: 1_000, samples: windowSamples}).levels).toEqual([0])
    expect(createPAudioEnvelope({sampleRate: 1_000, samples: emptyLevels}).levels).toEqual([])
  })
})

describe('getPAudioEnvelopeLevel', () => {
  const envelope = {frameDurationMs: 20, levels: [0, 1]}

  it('should return silence before playback, for an empty envelope, and after its last frame', () => {
    expect(getPAudioEnvelopeLevel(envelope, -1)).toBe(0)
    expect(getPAudioEnvelopeLevel({frameDurationMs: 20, levels: []}, 0)).toBe(0)
    expect(getPAudioEnvelopeLevel(envelope, 40)).toBe(0)
  })

  it('should retain the last level when interpolation has no following frame', () => {
    expect(getPAudioEnvelopeLevel(envelope, 30)).toBe(1)
  })
})

describe('createPWaveEnvelope', () => {
  it('should reject short and invalid RIFF headers', () => {
    expect(createPWaveEnvelope(new ArrayBuffer(11))).toBeNull()
    expect(createPWaveEnvelope(new ArrayBuffer(12))).toBeNull()
  })

  it('should reject a chunk extending beyond the buffer', () => {
    const {buffer, view} = createRiffBuffer(20)
    writeText(view, 12, 'data')
    view.setUint32(16, 4, true)

    expect(createPWaveEnvelope(buffer)).toBeNull()
  })

  it('should reject an unsupported PCM format', () => {
    const {buffer, view} = createRiffBuffer(36)
    writeText(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 3, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 1_000, true)
    view.setUint16(34, 16, true)

    expect(createPWaveEnvelope(buffer)).toBeNull()
  })

  it('should reject a RIFF container without audio format and sample data', () => {
    expect(createPWaveEnvelope(createRiffBuffer(12).buffer)).toBeNull()
  })
})

describe('createPVisemeDriver', () => {
  it('should narrow an initial rest cue and use the default frame duration after time reverses', () => {
    const driver = createPVisemeDriver()

    expect(driver.update({currentTimeMs: 100, intensity: 1, viseme: 'rest'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 50, intensity: 1, viseme: 'open'})).toBe('narrow')
  })

  it('should reset every accumulated mouth state', () => {
    const driver = createPVisemeDriver()
    driver.update({currentTimeMs: 0, intensity: 1, viseme: 'open'})
    driver.update({currentTimeMs: 150, intensity: 1, viseme: 'open'})

    driver.reset()

    expect(driver.update({currentTimeMs: 0, intensity: 0.05, viseme: 'rest'})).toBe('rest')
  })
})
