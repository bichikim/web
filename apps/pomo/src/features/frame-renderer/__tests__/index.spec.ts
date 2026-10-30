/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {FrameRenderer as SharedFrameRenderer} from '@winter-love/wallpaper/frame-renderer'
import {prepareVideoBackground} from '../../video-background'
import {FrameRenderer} from '..'

vi.mock('@winter-love/wallpaper/frame-renderer', () => ({FrameRenderer: vi.fn()}))
vi.mock('../../video-background', () => ({prepareVideoBackground: vi.fn()}))
afterEach(() => vi.clearAllMocks())

it('should supply Pomo video preparation to the shared renderer', async () => {
  const options = {canvas: document.createElement('canvas'), onEnded: vi.fn(), onError: vi.fn()}
  const renderer = new FrameRenderer(options)
  expect(renderer).toBeInstanceOf(FrameRenderer)
  const forwarded = vi.mocked(SharedFrameRenderer).mock.calls[0]?.[0]
  const video = new Blob(['video'])
  vi.mocked(prepareVideoBackground).mockResolvedValue(null)
  await forwarded?.prepareVideoBackground?.('clip', video)
  expect(prepareVideoBackground).toHaveBeenCalledWith('clip', video)
  expect(forwarded).toMatchObject(options)
})

it('should preserve a caller-provided video preparer', async () => {
  const prepare = vi.fn(async () => null)
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
    prepareVideoBackground: prepare,
  })
  expect(renderer).toBeInstanceOf(FrameRenderer)
  const forwarded = vi.mocked(SharedFrameRenderer).mock.calls[0]?.[0]
  const video = new Blob(['video'])
  await forwarded?.prepareVideoBackground?.('clip', video)
  expect(prepare).toHaveBeenCalledWith('clip', video)
  expect(prepareVideoBackground).not.toHaveBeenCalled()
})
