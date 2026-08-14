import {describe, expect, it} from 'vitest'

import {createDialogueTimeline, getDialoguePositionAtTime, getDialogueTextAtTime} from '../timeline'

describe('createDialogueTimeline', () => {
  it('should derive segment offsets from PCM duration and inter-chunk silence', () => {
    const timeline = createDialogueTimeline({
      audioChunks: [
        {
          generationTime: 900,
          index: 0,
          sampleRate: 1000,
          samples: new Float32Array(500),
          total: 2,
        },
        {
          generationTime: 200,
          index: 1,
          sampleRate: 1000,
          samples: new Float32Array(750),
          total: 2,
        },
      ],
      silenceDuration: 0.3,
      textChunks: ['첫 문장', '두 번째 문장'],
    })

    expect(timeline).toEqual({
      durationMs: 1550,
      segments: [
        {durationMs: 500, index: 0, startMs: 0, text: '첫 문장'},
        {durationMs: 750, index: 1, startMs: 800, text: '두 번째 문장'},
      ],
    })
  })

  it('should reject audio chunks without matching text', () => {
    expect(() =>
      createDialogueTimeline({
        audioChunks: [
          {
            generationTime: 100,
            index: 1,
            sampleRate: 1000,
            samples: new Float32Array(100),
            total: 1,
          },
        ],
        silenceDuration: 0.3,
        textChunks: ['첫 문장'],
      }),
    ).toThrow('Missing text for dialogue audio chunk 1.')
  })
})

describe('getDialogueTextAtTime', () => {
  const segments = [
    {durationMs: 500, index: 0, startMs: 0, text: '첫 문장'},
    {durationMs: 750, index: 1, startMs: 800, text: '두 번째 문장'},
  ]

  it('should retain the previous line during inter-chunk silence', () => {
    expect(getDialogueTextAtTime(segments, 700)).toBe('첫 문장')
  })

  it('should switch text when the next audio chunk begins', () => {
    expect(getDialogueTextAtTime(segments, 800)).toBe('두 번째 문장')
  })

  it('should return null when no dialogue segment exists', () => {
    expect(getDialogueTextAtTime([], 0)).toBeNull()
  })
})

describe('getDialoguePositionAtTime', () => {
  const segments = [
    {durationMs: 500, index: 4, startMs: 0, text: '첫 문장'},
    {durationMs: 750, index: 8, startMs: 800, text: '두 번째 문장'},
  ]

  it('should return the array position rather than the stored segment index', () => {
    expect(getDialoguePositionAtTime(segments, 800)).toEqual({
      position: 1,
      text: '두 번째 문장',
    })
  })

  it('should return null when no dialogue segment exists', () => {
    expect(getDialoguePositionAtTime([], 0)).toBeNull()
  })
})
