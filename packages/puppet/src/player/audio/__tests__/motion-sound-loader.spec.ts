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
})
