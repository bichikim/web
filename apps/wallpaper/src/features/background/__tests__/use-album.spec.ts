/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {AlbumWallpaper} from '@winter-love/wallpaper/settings/model'
import {useAlbum} from '../use-album'

const renderer = vi.hoisted(() => ({
  cancelPending: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  initialize: vi.fn(async () => undefined),
  present: vi.fn(async () => true),
  setVideoLoop: vi.fn(),
  show: vi.fn(async () => true),
}))
vi.mock('@winter-love/wallpaper/frame-renderer', () => ({
  FrameRenderer: class {
    constructor() {
      Object.assign(this, renderer)
    }
  },
}))
const content: AlbumWallpaper = {
  mediaIds: ['first', 'second'],
  mode: 'album',
  order: 'sequential',
  photoSeconds: 1,
  transition: 'cross-warp',
  videoMode: 'end',
}
const items = ['first', 'second'].map((id) => ({
  id,
  kind: 'photo' as const,
  name: `${id}.png`,
  size: 1,
}))
const setup = (load = vi.fn(async () => new Blob(['image']))) => {
  const [album, setAlbum] = createSignal(content)
  const onError = vi.fn()
  const hook = renderHook(() =>
    useAlbum({
      canvas: () => document.createElement('canvas'),
      content: album,
      items: () => items,
      load,
      onError,
    }),
  )
  return {...hook, load, onError, setAlbum}
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should start the photo deadline only after the selected transition completes', async () => {
  const animation = Promise.withResolvers<boolean>()
  renderer.present.mockReturnValueOnce(animation.promise)
  const hook = setup()
  await vi.advanceTimersByTimeAsync(0)
  expect(renderer.present).toHaveBeenCalledWith('cross-warp')
  await vi.advanceTimersByTimeAsync(1000)
  expect(hook.load).toHaveBeenCalledTimes(1)
  animation.resolve(true)
  await vi.advanceTimersByTimeAsync(1000)
  expect(hook.load).toHaveBeenLastCalledWith('second')
  hook.cleanup()
  expect(renderer.destroy).toHaveBeenCalledOnce()
})

it('should ignore a replaced file that finishes loading late and cancel pending presentation', async () => {
  const loading = Promise.withResolvers<Blob>()
  const current = new Blob(['current'])
  const load = vi.fn(async () => current).mockReturnValueOnce(loading.promise)
  const hook = setup(load)
  await vi.advanceTimersByTimeAsync(0)
  hook.setAlbum({...content, mediaIds: ['second']})
  await vi.advanceTimersByTimeAsync(0)
  expect(renderer.show).toHaveBeenCalledExactlyOnceWith(current, 'photo', 'second')
  loading.resolve(new Blob(['stale']))
  await vi.advanceTimersByTimeAsync(0)
  expect(renderer.show).toHaveBeenCalledTimes(1)
  expect(renderer.cancelPending).toHaveBeenCalled()
  hook.cleanup()
})

it('should skip animation when the system requests reduced motion', async () => {
  vi.stubGlobal('matchMedia', () => ({matches: true}))
  const hook = setup()
  await vi.advanceTimersByTimeAsync(0)
  expect(renderer.present).toHaveBeenCalledWith('none')
  hook.cleanup()
})
