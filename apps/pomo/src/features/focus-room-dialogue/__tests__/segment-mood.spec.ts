import {describe, expect, it, vi} from 'vitest'

import {
  type TextMoodAnalysis,
  type TextMoodAnalyzer,
  textMoodFailure,
  textMoodSuccess,
} from '../../text-mood'
import {analyzeDialogueSegmentMoods} from '../segment-mood'

const cheerfulAnalysis: TextMoodAnalysis = {
  margin: 0.6,
  modifiers: [
    {active: false, id: 'playful', probability: 0.1, threshold: 0.5},
    {active: false, id: 'sarcastic', probability: 0.05, threshold: 0.5},
  ],
  primary: {id: 'cheerful', probability: 0.8},
  scores: [
    {id: 'cheerful', probability: 0.8},
    {id: 'hopeful', probability: 0.2},
  ],
  secondary: {id: 'hopeful', probability: 0.2},
  uncertain: false,
}

const segments = [
  {durationMs: 1000, index: 0, startMs: 0, text: '오늘은 정말 신나는 날이야!'},
  {durationMs: 900, index: 1, startMs: 1200, text: '우리 함께 시작해 보자.'},
] as const

describe('analyzeDialogueSegmentMoods', () => {
  it('should analyze segments sequentially with the preceding sentence as context', async () => {
    const analyze = vi
      .fn<TextMoodAnalyzer['analyze']>()
      .mockResolvedValueOnce(
        textMoodSuccess({analysis: cheerfulAnalysis, elapsedMilliseconds: 12, status: 'complete'}),
      )
      .mockResolvedValueOnce(
        textMoodSuccess({
          elapsedMilliseconds: 8,
          status: 'insufficient',
          sufficiency: {insufficient: true, probability: 0.8, threshold: 0.5},
        }),
      )
    const onProgress = vi.fn()

    const result = await analyzeDialogueSegmentMoods({
      analyzer: {analyze},
      onProgress,
      segments,
    })

    expect(analyze).toHaveBeenNthCalledWith(1, {text: segments[0].text})
    expect(analyze).toHaveBeenNthCalledWith(2, {
      context: segments[0].text,
      text: segments[1].text,
    })
    expect(result[0]).toEqual({...segments[0], mood: cheerfulAnalysis})
    expect(result[1]).toBe(segments[1])
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('should leave mood absent and continue when one segment analysis fails', async () => {
    const error = {code: 'worker-failed', phase: 'analyze', retryable: true} as const
    const analyze = vi
      .fn<TextMoodAnalyzer['analyze']>()
      .mockResolvedValueOnce(textMoodFailure(error))
      .mockRejectedValueOnce(new Error('unexpected failure'))
    const onError = vi.fn()

    const result = await analyzeDialogueSegmentMoods({analyzer: {analyze}, onError, segments})

    expect(result).toEqual(segments)
    expect(result.every((segment) => !('mood' in segment))).toBe(true)
    expect(onError).toHaveBeenCalledTimes(2)
  })
})
