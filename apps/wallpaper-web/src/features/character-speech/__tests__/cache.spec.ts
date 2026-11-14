import {IDBFactory, IDBObjectStore as ObjectStore} from 'fake-indexeddb'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createSpeechCache} from '../cache'
let cache: ReturnType<typeof createSpeechCache>

beforeEach(() => {
  const factory = new IDBFactory()
  cache = createSpeechCache(() => factory)
})
afterEach(() => {
  vi.restoreAllMocks()
})

test('should commit MP3 and mouth frames together and read them through a new connection', async () => {
  expect(await cache.read('line')).toEqual({ok: true, value: null})
  const clip = {
    audio: new Blob([Uint8Array.of(255, 251, 144)], {type: 'audio/mpeg'}),
    mouth: {duration: 0.02, frames: Float32Array.of(0, 0, 1, 0), step: 0.02},
  }
  expect(await cache.write('line', clip)).toEqual({ok: true, value: undefined})
  const read = await cache.read('line')
  expect(read.ok).toBe(true)
  if (read.ok && read.value !== null) {
    expect(read.value.audio.type).toBe('audio/mpeg')
    expect(await read.value.audio.arrayBuffer()).toEqual(await clip.audio.arrayBuffer())
    expect(read.value.mouth.frames).toEqual(clip.mouth.frames)
  }
})

test('should report storage failures without treating them as a cache hit', async () => {
  cache = createSpeechCache(() => {
    throw new Error('Storage blocked')
  })
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  expect(await cache.read('line')).toEqual({error: 'unavailable', ok: false})
})

test('should report an aborted transaction even after its write request succeeds', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const put = ObjectStore.prototype.put
  vi.spyOn(ObjectStore.prototype, 'put').mockImplementation(function abortAfterWrite(
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    const request = put.call(this, value, key)
    request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  const clip = {
    audio: new Blob(['mp3'], {type: 'audio/mpeg'}),
    mouth: {duration: 0.02, frames: Float32Array.of(0, 0, 1, 0), step: 0.02},
  }
  expect(await cache.write('line', clip)).toEqual({error: 'unavailable', ok: false})
  expect(await cache.read('line')).toEqual({ok: true, value: null})
})
