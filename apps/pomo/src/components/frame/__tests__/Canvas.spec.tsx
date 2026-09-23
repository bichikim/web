/** @vitest-environment jsdom */
import {render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {showFrame} from 'src/features/background'
import {FrameRenderer} from 'src/features/frame-renderer'
import {Canvas} from '../Canvas'
vi.mock('src/features/background', async () => {
  const actual =
    await vi.importActual<typeof import('src/features/background')>('src/features/background')
  return {...actual, showFrame: vi.fn()}
})
vi.mock('src/features/frame-renderer', () => ({FrameRenderer: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))
const renderer = {
  cancelPending: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  initialize: vi.fn(async () => undefined),
  setVideoLoop: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(showFrame).mockReset()
  vi.mocked(FrameRenderer).mockImplementation(function createRenderer() {
    return renderer as unknown as FrameRenderer
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
})
it('should show the empty state after initializing and destroy its renderer on unmount', async () => {
  const view = render(() => <Canvas background={createBackground()} />)
  expect(screen.getByText('보여줄 사진 또는 동영상이 없어요')).toBeInTheDocument()
  await waitFor(() => expect(renderer.clear).toHaveBeenCalled())
  expect(renderer.setVideoLoop).toHaveBeenCalledWith(false)
  view.unmount()
  expect(renderer.destroy).toHaveBeenCalledOnce()
})
it('should show a renderer initialization failure rather than an empty album message', async () => {
  renderer.initialize.mockRejectedValueOnce(new Error('WebGL'))
  render(() => <Canvas background={createBackground()} />)
  expect(
    await screen.findByText('사진 또는 동영상을 재생하지 못했어요. 설정에서 파일을 확인해 주세요.'),
  ).toBeInTheDocument()
})

it('should use a canvas-backed video texture in Apps in Toss', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  render(() => <Canvas background={createBackground()} />)
  await waitFor(() =>
    expect(FrameRenderer).toHaveBeenCalledWith(
      expect.objectContaining({videoTextureMode: 'canvas'}),
    ),
  )
})

it('should mark a slide failed when its transition does not present', async () => {
  const item = {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'photo' as const,
    name: 'Photo',
    size: 1,
  }
  const background = {...createBackground(), items: vi.fn(() => [item])}
  vi.mocked(showFrame).mockResolvedValue(null)

  render(() => <Canvas background={background} />)

  await waitFor(() => expect(background.markFailed).toHaveBeenCalledWith(item.id))
})

it('should ignore a canceled frame after the canvas is unmounted', async () => {
  const item = {
    id: '22222222-2222-4222-8222-222222222222',
    kind: 'photo' as const,
    name: 'Photo',
    size: 1,
  }
  const background = {...createBackground(), items: vi.fn(() => [item])}
  let finish!: (shown: null) => void
  vi.mocked(showFrame).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )

  const view = render(() => <Canvas background={background} />)
  await waitFor(() => expect(showFrame).toHaveBeenCalled())
  view.unmount()
  finish(null)
  await Promise.resolve()

  expect(background.markFailed).not.toHaveBeenCalled()
})
