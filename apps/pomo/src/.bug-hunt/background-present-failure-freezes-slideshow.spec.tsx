/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {DEFAULT_BACKGROUND, type BackgroundController} from 'src/features/background'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {FrameRenderer} from 'src/features/frame-renderer'
import {Canvas} from 'src/components/frame/Canvas'

const {showFrame} = vi.hoisted(() => ({
  showFrame: vi.fn(),
}))

vi.mock('src/features/background', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/background')>()
  return {...actual, showFrame}
})

vi.mock('src/features/frame-renderer', () => ({FrameRenderer: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

const firstPhoto = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'photo' as const,
  name: 'A',
  size: 1,
}
const secondPhoto = {
  id: '22222222-2222-4222-8222-222222222222',
  kind: 'photo' as const,
  name: 'B',
  size: 1,
}

const renderer = {
  cancelPending: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  initialize: vi.fn(async () => undefined),
  removePhoto: vi.fn(),
  setVideoLoop: vi.fn(),
}

const createSlideshowBackground = (markFailed: ReturnType<typeof vi.fn>): BackgroundController => ({
  ...createBackground(),
  failedIds: () => [],
  items: () => [firstPhoto, secondPhoto],
  markFailed,
  preferences: () => ({...DEFAULT_BACKGROUND, photoSeconds: 10}),
  retry: vi.fn(),
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  vi.clearAllMocks()
  showFrame.mockResolvedValue(null)
  vi.mocked(FrameRenderer).mockImplementation(function createRenderer() {
    return renderer as unknown as FrameRenderer
  })
})

afterEach(() => {
  vi.useRealTimers()
})

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('background slideshow when showFrame returns null', () => {
  it('should mark the slide failed and advance instead of freezing playback', async () => {
    const markFailed = vi.fn()
    render(() => <Canvas background={createSlideshowBackground(markFailed)} />)

    await flushPromises()
    await flushPromises()

    expect(showFrame).toHaveBeenCalledOnce()
    expect(showFrame.mock.calls[0]?.[0].item.id).toBe(firstPhoto.id)

    vi.advanceTimersByTime(15_000)

    expect(markFailed).toHaveBeenCalledWith(firstPhoto.id)
    expect(showFrame.mock.calls.some((call) => call[0].item.id === secondPhoto.id)).toBe(true)
  })
})
