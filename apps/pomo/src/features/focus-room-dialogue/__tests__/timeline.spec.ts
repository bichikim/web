/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  createDialogueTimeline,
  getDialoguePositionAtTime,
  getDialogueTextAtTime,
  getDialogueVisemeAtTime,
} from '../timeline'

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
        {
          durationMs: 500,
          index: 0,
          startMs: 0,
          text: '첫 문장',
          visemes: expect.any(Array),
        },
        {
          durationMs: 750,
          index: 1,
          startMs: 800,
          text: '두 번째 문장',
          visemes: expect.any(Array),
        },
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

  it.each([
    {currentTimeMs: -Infinity, position: null},
    {currentTimeMs: -1, position: null},
    {currentTimeMs: 0, position: 0},
    {currentTimeMs: 500, position: 0},
    {currentTimeMs: 700, position: 0},
    {currentTimeMs: 799, position: 0},
    {currentTimeMs: 800, position: 1},
    {currentTimeMs: 2000, position: 1},
    {currentTimeMs: Infinity, position: 1},
    {currentTimeMs: NaN, position: 1},
  ])('should resolve position $position at time $currentTimeMs', ({currentTimeMs, position}) => {
    expect(getDialoguePositionAtTime(segments, currentTimeMs)).toEqual(
      position === null ? null : {position, text: segments[position]?.text},
    )
  })

  it('should retain the final segment with the same start time', () => {
    expect(getDialoguePositionAtTime([segments[0]!, {...segments[1]!, startMs: 0}], 0)).toEqual({
      position: 1,
      text: '두 번째 문장',
    })
  })

  it('should stop at the first future segment even when later segments have started', () => {
    expect(
      getDialoguePositionAtTime(
        [...segments, {durationMs: 100, index: 10, startMs: 100, text: '세 번째 문장'}],
        700,
      ),
    ).toEqual({position: 0, text: '첫 문장'})
  })

  it('should return the array position rather than the stored segment index', () => {
    expect(getDialoguePositionAtTime(segments, 800)).toEqual({
      position: 1,
      text: '두 번째 문장',
    })
  })

  it('should return null when no dialogue segment exists', () => {
    expect(getDialoguePositionAtTime([], 0)).toBeNull()
  })

  it('should reject a sparse segment before reaching the next boundary', () => {
    const sparseSegments = [...segments]
    delete sparseSegments[0]

    expect(() => getDialoguePositionAtTime(sparseSegments, 700)).toThrow(TypeError)
  })
})

describe('getDialogueVisemeAtTime', () => {
  it('should resolve persisted cues relative to the active segment', () => {
    expect(
      getDialogueVisemeAtTime(
        [
          {
            durationMs: 200,
            index: 0,
            startMs: 100,
            text: '아',
            visemes: [
              {endMs: 100, startMs: 0, viseme: 'open'},
              {endMs: 200, startMs: 100, viseme: 'rest'},
            ],
          },
        ],
        149,
      ),
    ).toBe('open')
    expect(
      getDialogueVisemeAtTime(
        [
          {
            durationMs: 200,
            index: 0,
            startMs: 100,
            text: '아',
            visemes: [
              {endMs: 100, startMs: 0, viseme: 'open'},
              {endMs: 200, startMs: 100, viseme: 'rest'},
            ],
          },
        ],
        150,
      ),
    ).toBe('rest')
  })

  it('should derive cues for legacy segments without a stored track', () => {
    expect(getDialogueVisemeAtTime([{durationMs: 200, index: 0, startMs: 0, text: '오'}], 50)).toBe(
      'round',
    )
  })

  it('should rest during inter-segment silence', () => {
    expect(
      getDialogueVisemeAtTime(
        [
          {durationMs: 100, index: 0, startMs: 0, text: '아'},
          {durationMs: 100, index: 1, startMs: 200, text: '오'},
        ],
        150,
      ),
    ).toBe('rest')
  })
})
