import {expect, it, vi} from 'vitest'
import {analyzeVowels} from '@winter-love/puppet/player'
import {createMicrophoneAnalysis} from '../create-microphone-analysis'

vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  analyzeVowels: vi.fn(() => ({level: 0.8, weights: {a: 0.8, e: 0, i: 0, o: 0, u: 0}})),
}))
it('should show the input level while suppressing quiet sound and close smoothly after speech', () => {
  const analyze = createMicrophoneAnalysis()
  const audio = {sampleRate: 16000, samples: new Float32Array(640).fill(0.02)}
  const muted = analyze(audio, 1)
  expect(muted.inputLevel).toBeGreaterThan(0)
  expect(muted.level).toBe(0)
  const speaking = analyze(audio, 0)
  expect(speaking.level).toBeGreaterThan(0)
  expect(speaking.shape).toBe('a')
  vi.mocked(analyzeVowels).mockReturnValueOnce({level: 0, weights: {a: 0, e: 0, i: 0, o: 0, u: 0}})
  const closing = analyze({...audio, samples: new Float32Array(640)}, 0.2)
  expect(closing.inputLevel).toBe(0)
  expect(closing.level).toBeLessThan(speaking.level)
})
