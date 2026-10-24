/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {
  type ModelDownloadController,
  type ModelDownloadRuntime,
  PModelDownloadProvider,
  useModelDownload,
} from '../../../features/model-download'
import {SceneModelDownloadFallback} from '../ModelDownloadFallback'

it('should expose download progress and cancellation before the scene toolbar is visible', async () => {
  let download: ModelDownloadController | undefined
  const dispose = vi.fn()
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => ({dispose, prepare: vi.fn()})),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }
  const CaptureFallback = () => {
    download = useModelDownload()
    return <SceneModelDownloadFallback isVisible />
  }
  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <CaptureFallback />
    </PModelDownloadProvider>
  ))

  if (download === undefined) {
    throw new Error('모델 다운로드 controller가 준비되지 않았습니다.')
  }

  const result = download.startTextModel('gemma-4-e2b')
  expect(screen.getByRole('status').textContent).toContain('Gemma 4 E2B 모델 받는 중')
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  await expect(result).resolves.toEqual({status: 'cancelled'})
  expect(dispose).toHaveBeenCalledTimes(1)
})

it('should stay absent while the scene toolbar owns the download status', () => {
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => ({dispose: vi.fn(), prepare: vi.fn()})),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }

  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <SceneModelDownloadFallback isVisible={false} />
    </PModelDownloadProvider>
  ))

  expect(screen.queryByRole('status')).toBeNull()
})
