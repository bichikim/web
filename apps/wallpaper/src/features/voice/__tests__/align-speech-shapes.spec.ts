import {expect, it, vi} from 'vitest'
import {alignSpeechShapes} from '../align-speech-shapes'
import {analyzeSpeechFrame} from '../analyze-speech-frame'

vi.mock('../analyze-speech-frame', () => ({analyzeSpeechFrame: vi.fn()}))

const audio = () => {
  const samples = new Float32Array(16000)
  samples.fill(0.1, 3200, 11200)
  return {sampleRate: 16000, samples}
}
it('should align bilabial onsets between vowels and keep their closures brief across pauses', async () => {
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  const samples = new Float32Array(24000)
  samples.fill(0.1, 3200, 6400)
  samples.fill(0.1, 8800, 12000)
  samples.fill(0.1, 16000, 19200)
  const cues = await alignSpeechShapes({audio: {sampleRate: 16000, samples}, text: '마. 바. 파.'})
  expect(cues.map((cue) => cue.shape)).toEqual(['closed', 'a', 'closed', 'a', 'closed', 'a'])
  const closures = cues.filter((cue) => cue.shape === 'closed')
  expect(closures.every((cue) => cue.end - cue.start >= 0.04 && cue.end - cue.start <= 0.13)).toBe(
    true,
  )
  expect(
    cues.filter((cue) => cue.shape !== 'closed').every((cue) => cue.end - cue.start >= 0.08),
  ).toBe(true)
  expect(closures[1].start).toBeGreaterThan(0.4)
  expect(closures[2].start).toBeGreaterThan(0.85)
})
it('should retain a final bilabial closure and avoid closing for other consonants', async () => {
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  const cues = await alignSpeechShapes({audio: audio(), text: '암'})
  expect(cues.map((cue) => cue.shape)).toEqual(['a', 'closed'])
  expect(cues.at(-1)!.end - cues.at(-1)!.start).toBeLessThanOrEqual(0.13)
  expect(
    (await alignSpeechShapes({audio: audio(), text: '안'})).every((cue) => cue.shape !== 'closed'),
  ).toBe(true)
})
it('should retain two equal vowels separated by an audible closure in decomposed Korean text', async () => {
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  const source = audio()
  source.samples.fill(0, 6400, 7360)
  const cues = await alignSpeechShapes({audio: source, text: '아마'.normalize('NFD')})
  expect(cues.map((cue) => cue.shape)).toEqual(['a', 'closed', 'a'])
  const closure = cues[1]
  expect(closure.start).toBeGreaterThanOrEqual(0.34)
  expect(closure.end).toBeLessThanOrEqual(0.52)
})
it('should use vowel evidence when the audio is too short to resolve the written closures', async () => {
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  const cues = await alignSpeechShapes({
    audio: {sampleRate: 16000, samples: new Float32Array(800).fill(0.1)},
    text: '마마마',
  })
  expect(cues.length).toBeGreaterThan(0)
  expect(cues.every((cue) => cue.shape === 'a')).toBe(true)
})
it('should constrain an ambiguous vowel to the spoken Korean text within the actual audio region', async () => {
  vi.mocked(analyzeSpeechFrame).mockReturnValue({e: 1})
  const cues = await alignSpeechShapes({audio: audio(), text: '아. 아.'})
  expect(cues.length).toBeGreaterThan(0)
  expect(cues.every((cue) => cue.shape === 'a')).toBe(true)
  expect(cues[0].start).toBeGreaterThanOrEqual(0.16)
  expect(cues.at(-1)!.end).toBeLessThanOrEqual(0.74)
})
it('should place changing vowels using acoustic evidence while retaining their spoken order', async () => {
  vi.mocked(analyzeSpeechFrame).mockImplementation((_, time) => (time < 0.38 ? {i: 1} : {o: 1}))
  const cues = await alignSpeechShapes({audio: audio(), text: '이오'})
  expect(cues.map((cue) => cue.shape)).toEqual(['i', 'o'])
  expect(cues[0].end).toBeGreaterThan(0.32)
  expect(cues[0].end).toBeLessThan(0.44)
  expect(cues[0].end).toBe(cues[1].start)
})
it('should leave silence and text without reliable Korean vowel cues to acoustic playback', async () => {
  expect(
    await alignSpeechShapes({audio: {...audio(), samples: new Float32Array(16000)}, text: '아'}),
  ).toEqual([])
  expect(await alignSpeechShapes({audio: audio(), text: 'Hello world'})).toEqual([])
})
it('should cancel preparation before reading samples when its owner is obsolete', async () => {
  const request = new AbortController()
  request.abort()
  await expect(
    alignSpeechShapes({audio: audio(), signal: request.signal, text: '아'}),
  ).rejects.toMatchObject({name: 'AbortError'})
})
it('should preserve acoustic-only spans for foreign words inside Korean narration', async () => {
  vi.mocked(analyzeSpeechFrame).mockImplementation((_, time) =>
    time < 0.3 ? {i: 1} : time < 0.55 ? {e: 1} : {o: 1},
  )
  const cues = await alignSpeechShapes({audio: audio(), text: '이 Codex 오'})
  expect(cues[0].shape).toBe('i')
  expect(cues.some((cue) => cue.shape === null)).toBe(true)
  expect(cues.at(-1)!.shape).toBe('o')
})
