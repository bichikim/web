import {describe, expect, test, vi} from 'vitest'

import {createMotionSoundLoader} from '../motion-sound-loader'
import {encodeWav} from './support/encode-wav'

type Resolve = (bytes: ArrayBuffer) => void

const wav = encodeWav({channels: [new Float32Array(80)], sampleRate: 8000})
const document = (...srcs: ReadonlyArray<string>) => ({
  motions: srcs.map((src, index) => ({duration: 1, id: `m${index}`, sound: {src}, tracks: []})),
})

describe('createMotionSoundLoader', () => {
  test('should drop sounds the document no longer uses, even while they load', async () => {
    const pending = new Map<string, Resolve>()
    const read = (src: string) =>
      new Promise<ArrayBuffer>((resolve) => {
        pending.set(src, resolve)
      })
    const fetchBytes = vi.fn(read)
    const onError = vi.fn()
    const loader = createMotionSoundLoader({fetchBytes, onError})
    loader.load(document('a.wav', 'b.wav'))
    pending.get('a.wav')?.(wav.slice().buffer)
    await vi.waitFor(() => expect(loader.get('a.wav')).toBeDefined())

    // `b` is replaced before it finishes and `a` is removed.
    loader.load(document('c.wav'))
    pending.get('b.wav')?.(wav.slice().buffer)
    pending.get('c.wav')?.(wav.slice().buffer)
    await vi.waitFor(() => expect(loader.get('c.wav')).toBeDefined())
    expect(loader.get('a.wav')).toBeUndefined()
    expect(loader.get('b.wav')).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()

    // A sound used again loads again.
    loader.load(document('a.wav', 'c.wav'))
    expect(fetchBytes.mock.calls.map(([src]) => src)).toEqual(['a.wav', 'b.wav', 'c.wav', 'a.wav'])
  })

  test('should retry a failed fetch on the next load and report each failure once', async () => {
    const fetchBytes = vi
      .fn<(src: string) => Promise<ArrayBuffer>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(wav.slice().buffer)
    const onError = vi.fn()
    const loader = createMotionSoundLoader({fetchBytes, onError})
    loader.load(document('a.wav'))
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    loader.load(document('a.wav'))
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    expect(onError).toHaveBeenLastCalledWith({reason: 'fetch-failed', src: 'a.wav'})
    loader.load(document('a.wav'))
    await vi.waitFor(() => expect(loader.get('a.wav')).toBeDefined())
    // A loaded sound is not fetched again.
    loader.load(document('a.wav'))
    expect(fetchBytes).toHaveBeenCalledTimes(3)
    expect(onError).toHaveBeenCalledTimes(2)
  })

  test('should not retry a sound that fetched but failed to decode', async () => {
    const fetchBytes = vi.fn(async () => new ArrayBuffer(8))
    const onError = vi.fn()
    const loader = createMotionSoundLoader({fetchBytes, onError})
    loader.load(document('a.wav'))
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith({reason: 'not-wav', src: 'a.wav'}))
    loader.load(document('a.wav'))
    expect(fetchBytes).toHaveBeenCalledOnce()
  })
})
