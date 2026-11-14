import {expect, test, vi} from 'vitest'
import {loadPresetSpeech, speechPresets} from '../presets'
import {prepareSpeechLine} from '../configuration'

const preset = speechPresets[0]!
const mouth = {duration: 1, frames: new Array(102).fill(0), step: 0.02}
const audio = {duration: 1} as AudioBuffer

test('should fetch a preset MP3 and mouth JSON without speech synthesis', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(Uint8Array.of(255, 251)))
    .mockResolvedValueOnce(new Response(JSON.stringify(mouth)))
  const context = {decodeAudioData: vi.fn().mockResolvedValue(audio)}
  const result = await loadPresetSpeech({
    context,
    fetch: fetcher,
    key: preset.cacheKey,
    signal: new AbortController().signal,
    text: prepareSpeechLine(preset.text),
  })
  expect(result?.audio).toBe(audio)
  expect(result?.mouth.frames).toBeInstanceOf(Float32Array)
  expect(fetcher).toHaveBeenCalledWith(
    `${preset.audio}?v=${preset.cacheKey}`,
    expect.objectContaining({signal: expect.any(AbortSignal)}),
  )
  expect(fetcher).toHaveBeenCalledWith(
    `${preset.mouth}?v=${preset.cacheKey}`,
    expect.objectContaining({signal: expect.any(AbortSignal)}),
  )
})

test('should leave custom speech on the synthesis path without fetching preset assets', async () => {
  const fetcher = vi.fn()
  const context = {decodeAudioData: vi.fn()}
  const result = await loadPresetSpeech({
    context,
    fetch: fetcher,
    key: 'custom',
    signal: new AbortController().signal,
    text: '직접 적은 문장',
  })
  expect(result).toBeNull()
  expect(fetcher).not.toHaveBeenCalled()
})

test('should reject missing preset files instead of silently downloading a synthesis model', () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('', {status: 404}))
  const context = {decodeAudioData: vi.fn()}
  return expect(
    loadPresetSpeech({
      context,
      fetch: fetcher,
      key: preset.cacheKey,
      signal: new AbortController().signal,
      text: prepareSpeechLine(preset.text),
    }),
  ).rejects.toThrow('Preset speech asset download failed')
})

test('should reject an old voice profile before fetching preset files', () => {
  const fetcher = vi.fn()
  const context = {decodeAudioData: vi.fn()}
  return expect(
    loadPresetSpeech({
      context,
      fetch: fetcher,
      key: 'old-profile',
      signal: new AbortController().signal,
      text: prepareSpeechLine(preset.text),
    }),
  ).rejects.toThrow('Preset speech profile differs')
})

test('should reject malformed mouth data', () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response('mp3'))
    .mockResolvedValueOnce(new Response(JSON.stringify({...mouth, frames: [0]})))
  const context = {decodeAudioData: vi.fn()}
  return expect(
    loadPresetSpeech({
      context,
      fetch: fetcher,
      key: preset.cacheKey,
      signal: new AbortController().signal,
      text: prepareSpeechLine(preset.text),
    }),
  ).rejects.toThrow('Preset speech mouth track is invalid')
})
