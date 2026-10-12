/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from 'src/features/model-download'
import type {SupertonicModelId} from 'src/features/supertonic'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {
  useAudioGeneration,
  type UseAudioGenerationProps,
} from '../components/dialogue-page/use-audio-generation'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))

const createHarness = (initialModelId: SupertonicModelId = 'full') => {
  const [modelId, setModelId] = createSignal<SupertonicModelId>(initialModelId)
  const editor: UseAudioGenerationProps['editor'] = {
    canGenerate: () => true,
    generate: vi.fn(async () => {}),
    modelId,
    progress: () => 0,
    state: () => ({message: '준비됨', status: 'idle'}),
  }
  const download: ModelDownloadController = {
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: () => [],
    startImageModel: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel: vi.fn(
      async (): Promise<ModelDownloadResult> => ({
        message: '다운로드 실패',
        status: 'error',
      }),
    ),
    state: () => ({status: 'idle'}),
  }
  vi.mocked(useModelDownload).mockReturnValue(download)
  vi.mocked(isSupertonicModelDownloaded).mockReset().mockResolvedValue(false)
  const view = renderHook(() => useAudioGeneration({draftBusy: () => false, editor}))
  return {download, editor, setModelId, ...view}
}

it('should clear a voice download error when the selected supertonic model changes', async () => {
  const {result, setModelId} = createHarness('full')

  await result.generate()
  await result.confirmDownload()
  expect(result.message()).toBe('다운로드 실패')

  setModelId('int8')
  expect(result.message()).toBe('준비됨')
})
