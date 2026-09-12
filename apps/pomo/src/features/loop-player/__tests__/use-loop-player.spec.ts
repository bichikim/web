/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createLoopPlayer, type LoopPlayback} from '../player'
import {useLoopPlayer} from '../use-loop-player'

vi.mock('../player', () => ({createLoopPlayer: vi.fn()}))

interface Deferred<Value> {
  readonly promise: Promise<Value>
  readonly resolve: (value: Value) => void
}

interface PlayerCallbacks {
  readonly onPosition: (seconds: number) => void
  readonly onReady: (seconds: number) => void
  readonly onStatus: (message: string, playing: boolean) => void
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

function createFile(): File {
  return {} as File
}

function createPlayback(close: () => Promise<void>): LoopPlayback {
  return {close, play: vi.fn(async () => {}), seek: vi.fn(async () => {}), stop: vi.fn()}
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should ignore callbacks from a replaced player until its asynchronous close releases the old URL', async () => {
  const close = createDeferred<void>()
  const first = createPlayback(() => close.promise)
  const second = createPlayback(async () => {})
  let callbacks: PlayerCallbacks | undefined
  vi.mocked(createLoopPlayer)
    .mockImplementationOnce((_url, onStatus, onReady, onPosition) => {
      callbacks = {onPosition: onPosition ?? (() => undefined), onReady, onStatus}
      return first
    })
    .mockReturnValueOnce(second)
  vi.spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))

  root.player.select(createFile())
  root.player.select(createFile())
  callbacks?.onStatus('stale playback', true)
  callbacks?.onReady(30)
  callbacks?.onPosition(15)

  expect(root.player.status()).toBe('오디오를 읽고 있어요…')
  expect(root.player.playing()).toBe(false)
  expect(root.player.duration()).toBe(0)
  expect(root.player.position()).toBe(0)
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()

  close.resolve(undefined)
  await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first'))

  root.dispose()
  await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second'))
})

it('should release a selected URL when closing its player fails', async () => {
  const close = vi.fn(async () => {
    throw new Error('context close failed')
  })
  vi.mocked(createLoopPlayer).mockReturnValue(createPlayback(close))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:failed-close')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))

  root.player.select(createFile())
  root.player.select(null)

  await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:failed-close'))
  expect(warning).toHaveBeenCalledWith('Audio cleanup failed', expect.any(Error))
  root.dispose()
})

it('should revoke a newly created URL when player construction fails', () => {
  vi.mocked(createLoopPlayer).mockImplementation(() => {
    throw new Error('audio context unavailable')
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:construction-failure')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))

  root.player.select(createFile())

  expect(root.player.status()).toBe('audio context unavailable')
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:construction-failure')
  root.dispose()
})

it('should defer position callbacks while scrubbing until the selected position is applied', async () => {
  const playback = createPlayback(async () => {})
  let callbacks: PlayerCallbacks | undefined
  vi.mocked(createLoopPlayer).mockImplementation((_url, onStatus, onReady, onPosition) => {
    callbacks = {onPosition: onPosition ?? (() => undefined), onReady, onStatus}
    return playback
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, player: useLoopPlayer()}))

  root.player.select(createFile())
  callbacks?.onPosition(30)
  root.player.previewPosition(60)
  callbacks?.onPosition(15)

  expect(root.player.position()).toBe(60)
  await root.player.seek()
  callbacks?.onPosition(20)

  expect(playback.seek).toHaveBeenCalledWith(60)
  expect(root.player.position()).toBe(20)
  root.dispose()
})
