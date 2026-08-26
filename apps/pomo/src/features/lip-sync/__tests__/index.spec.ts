import {describe, expect, it} from 'vitest'

import {
  createPAudioEnvelope,
  createPVisemeDriver,
  createPVisemeTrack,
  createPWaveEnvelope,
  getPAudioEnvelopeLevel,
  getPCoarticulatedVisemeAtTime,
  getPVisemeAtTime,
} from '../index'

describe('createPVisemeTrack', () => {
  it('should map Korean vowels and bilabial consonants to visible mouth shapes', () => {
    const cues = createPVisemeTrack({durationMs: 1_000, text: '마보이'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['closed', 'open', 'closed', 'round', 'wide'])
    expect(cues[0]?.startMs).toBe(0)
    expect(cues.at(-1)?.endMs).toBe(1_000)
  })

  it('should preserve pauses and fit every cue to the rendered duration', () => {
    const cues = createPVisemeTrack({durationMs: 600, text: '아, 오.'})

    expect(cues.map((cue) => cue.viseme)).toEqual(['open', 'rest', 'round', 'rest'])
    expect(cues.at(-1)?.endMs).toBe(600)
  })

  it('should return an empty track for zero duration', () => {
    expect(createPVisemeTrack({durationMs: 0, text: '안녕'})).toEqual([])
  })

  it('should keep an empty utterance at rest', () => {
    expect(createPVisemeTrack({durationMs: 300, text: ''})).toEqual([
      {endMs: 300, startMs: 0, viseme: 'rest'},
    ])
  })

  it('should map Latin shapes and a bilabial Hangul final', () => {
    const cues = createPVisemeTrack({durationMs: 1_000, text: 'AeiouBmx암'})

    expect(cues.map((cue) => cue.viseme)).toEqual([
      'open',
      'wide',
      'round',
      'closed',
      'narrow',
      'open',
    ])
  })

  it('should merge mouth cues that are too short to display', () => {
    const cues = createPVisemeTrack({durationMs: 100, text: 'aeo'})

    expect(cues).toEqual([{endMs: 100, startMs: 0, viseme: 'open'}])
  })
})

describe('getPVisemeAtTime', () => {
  const cues = createPVisemeTrack({durationMs: 300, text: '아오'})

  it('should resolve a cue from the current audio-clock position', () => {
    expect(getPVisemeAtTime(cues, 0)).toBe('open')
    expect(getPVisemeAtTime(cues, 200)).toBe('round')
  })

  it('should return rest outside the track', () => {
    expect(getPVisemeAtTime(cues, -1)).toBe('rest')
    expect(getPVisemeAtTime(cues, 300)).toBe('rest')
  })
})

describe('getPCoarticulatedVisemeAtTime', () => {
  const cues = [
    {endMs: 100, startMs: 0, viseme: 'open'},
    {endMs: 200, startMs: 100, viseme: 'round'},
  ] as const

  it('should expose the next mouth shape fifty milliseconds before its cue boundary', () => {
    expect(getPCoarticulatedVisemeAtTime(cues, 49)).toBe('open')
    expect(getPCoarticulatedVisemeAtTime(cues, 50)).toBe('round')
    expect(getPCoarticulatedVisemeAtTime(cues, 150)).toBe('rest')
  })

  it('should remain at rest before playback starts', () => {
    expect(getPCoarticulatedVisemeAtTime(cues, -1)).toBe('rest')
  })
})

describe('audio-driven visemes', () => {
  it('should derive silence and speech strength from PCM samples', () => {
    const envelope = createPAudioEnvelope({
      sampleRate: 1_000,
      samples: Float32Array.from({length: 200}, (_, index) => (index < 80 ? 0 : 0.5)),
    })

    expect(getPAudioEnvelopeLevel(envelope, 0)).toBe(0)
    expect(getPAudioEnvelopeLevel(envelope, 120)).toBeGreaterThan(0.9)
  })

  it('should ease through a narrow mouth and limit hard shape changes', () => {
    const driver = createPVisemeDriver()

    expect(driver.update({currentTimeMs: 0, intensity: 1, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 50, intensity: 1, viseme: 'round'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 100, intensity: 1, viseme: 'round'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 150, intensity: 1, viseme: 'round'})).toBe('round')
    expect(driver.update({currentTimeMs: 170, intensity: 0, viseme: 'rest'})).toBe('round')
    expect(driver.update({currentTimeMs: 500, intensity: 0, viseme: 'rest'})).toBe('rest')
  })

  it('should keep the full mouth stable while volume moves near its shape threshold', () => {
    const driver = createPVisemeDriver()

    expect(driver.update({currentTimeMs: 0, intensity: 1, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 150, intensity: 1, viseme: 'open'})).toBe('open')
    expect(driver.update({currentTimeMs: 250, intensity: 0, viseme: 'open'})).toBe('open')
    expect(driver.update({currentTimeMs: 300, intensity: 0, viseme: 'open'})).toBe('open')
    expect(driver.update({currentTimeMs: 350, intensity: 0, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 400, intensity: 0.5, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 500, intensity: 1, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 530, intensity: 1, viseme: 'open'})).toBe('open')
  })

  it('should hold settled speech shapes longer than the initial mouth opening', () => {
    const driver = createPVisemeDriver()

    expect(driver.update({currentTimeMs: 0, intensity: 1, viseme: 'open'})).toBe('narrow')
    expect(driver.update({currentTimeMs: 150, intensity: 1, viseme: 'open'})).toBe('open')
    expect(driver.update({currentTimeMs: 280, intensity: 1, viseme: 'wide'})).toBe('open')
    expect(driver.update({currentTimeMs: 340, intensity: 1, viseme: 'wide'})).toBe('wide')
  })

  it('should read Pomo mono PCM WAV audio into an envelope', () => {
    const buffer = new ArrayBuffer(48)
    const view = new DataView(buffer)
    const writeText = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index))
      }
    }

    writeText(0, 'RIFF')
    view.setUint32(4, 40, true)
    writeText(8, 'WAVE')
    writeText(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 1_000, true)
    view.setUint32(28, 2_000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeText(36, 'data')
    view.setUint32(40, 4, true)
    view.setInt16(44, 16_384, true)
    view.setInt16(46, 16_384, true)

    expect(createPWaveEnvelope(buffer)?.levels).toEqual([1])
  })
})
