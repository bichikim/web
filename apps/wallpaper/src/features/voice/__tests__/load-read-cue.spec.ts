import {afterEach, expect, it, vi} from 'vitest'
import {loadReadCue} from '../load-read-cue'

vi.mock('../assets/read-cue.wav?url', () => ({default: 'read-cue.wav'}))
afterEach(() => vi.unstubAllGlobals())

it('should decode the bundled cue with request cancellation and keep it out of playback', async () => {
  const bytes = new ArrayBuffer(8)
  const audio = {duration: 2}
  const fetch = vi.fn().mockResolvedValue({arrayBuffer: async () => bytes, ok: true})
  const decodeAudioData = vi.fn().mockResolvedValue(audio)
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  expect(await loadReadCue({decodeAudioData} as unknown as AudioContext, signal)).toBe(audio)
  expect(fetch).toHaveBeenCalledWith('read-cue.wav', {signal})
  expect(decodeAudioData).toHaveBeenCalledWith(bytes)
})
it('should reject a missing cue rather than silently starting an idle session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false}))
  await expect(loadReadCue({} as AudioContext, new AbortController().signal)).rejects.toMatchObject(
    {code: 'unavailable'},
  )
})
it('should reject cancelled preparation before opening the transport', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(loadReadCue({} as AudioContext, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
})
