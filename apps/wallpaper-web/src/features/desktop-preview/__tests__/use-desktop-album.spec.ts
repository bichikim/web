/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {type AlbumPreview, createAlbumPreview} from '../create-album-preview'
import {useDesktopAlbum} from '../use-desktop-album'

vi.mock('../create-album-preview', () => ({createAlbumPreview: vi.fn()}))

const renderer = {cancelPending: vi.fn(), destroy: vi.fn(), show: vi.fn()}
const presented = vi.fn()
const failed = vi.fn()

beforeEach(() => {
  renderer.show.mockResolvedValue(true)
  vi.mocked(createAlbumPreview).mockResolvedValue(renderer)
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const setup = () => {
  const [source, setSource] = createSignal('/first.webp')
  const hook = renderHook(() =>
    useDesktopAlbum({
      canvas: () => document.createElement('canvas'),
      effect: () => 'cross-warp',
      onError: failed,
      onPresented: presented,
      source,
    }),
  )
  return {...hook, setSource}
}

test('should start each display deadline only after the app transition completes', async () => {
  const hook = setup()
  await waitFor(() => expect(presented).toHaveBeenCalledOnce())
  expect(renderer.show).toHaveBeenCalledWith('/first.webp', 'cross-warp')
  expect(hook.result.ready()).toBe(true)
  presented.mockClear()
  let finish: ((completed: boolean) => void) | undefined
  renderer.show.mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve
    }),
  )
  hook.setSource('/second.webp')
  expect(presented).not.toHaveBeenCalled()
  expect(renderer.cancelPending).toHaveBeenCalledOnce()
  finish!(true)
  await waitFor(() => expect(presented).toHaveBeenCalledOnce())
  expect(renderer.show).toHaveBeenLastCalledWith('/second.webp', 'cross-warp')
})

test('should release a renderer that finishes initializing after unmount', async () => {
  let initialize: ((instance: AlbumPreview) => void) | undefined
  vi.mocked(createAlbumPreview).mockReturnValue(
    new Promise<AlbumPreview>((resolve) => {
      initialize = resolve
    }),
  )
  const hook = setup()
  hook.cleanup()
  initialize!(renderer)
  await waitFor(() => expect(renderer.destroy).toHaveBeenCalledOnce())
  expect(renderer.show).not.toHaveBeenCalled()
  expect(presented).not.toHaveBeenCalled()
})

test('should ignore a late transition completion after the preview is removed', async () => {
  let finish: ((completed: boolean) => void) | undefined
  renderer.show.mockReturnValue(
    new Promise<boolean>((resolve) => {
      finish = resolve
    }),
  )
  const hook = setup()
  await waitFor(() => expect(renderer.show).toHaveBeenCalledOnce())
  hook.cleanup()
  finish!(true)
  await Promise.resolve()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(presented).not.toHaveBeenCalled()
})

test('should report a rendering failure without starting the display deadline', async () => {
  const failure = new Error('WebGL unavailable')
  renderer.show.mockRejectedValue(failure)
  const hook = setup()
  await waitFor(() => expect(failed).toHaveBeenCalledWith(failure))
  expect(hook.result.ready()).toBe(false)
  expect(presented).not.toHaveBeenCalled()
})
