/** @vitest-environment jsdom */
import {render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {FrameRenderer} from 'src/features/frame-renderer'
import {Canvas} from '../Canvas'
vi.mock('src/features/frame-renderer', () => ({FrameRenderer: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))
const renderer = {
  clear: vi.fn(),
  destroy: vi.fn(),
  initialize: vi.fn(async () => undefined),
  setVideoLoop: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(FrameRenderer).mockImplementation(function createRenderer() {
    return renderer as unknown as FrameRenderer
  })
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
