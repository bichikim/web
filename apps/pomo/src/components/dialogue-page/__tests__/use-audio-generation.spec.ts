/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {useAudioGeneration, type UseAudioGenerationProps} from '../use-audio-generation'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/supertonic', () => ({isSupertonicModelDownloaded: vi.fn()}))

const createHarness = () => {
  const editor: UseAudioGenerationProps['editor'] = {
    canGenerate: () => true,
    generate: vi.fn(async () => {}),
    modelId: () => 'full',
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
    startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
    state: () => ({status: 'idle'}),
  }
  vi.mocked(useModelDownload).mockReturnValue(download)
  vi.mocked(isSupertonicModelDownloaded).mockReset().mockResolvedValue(false)
  const view = renderHook(() => useAudioGeneration({draftBusy: () => false, editor}))
  return {download, editor, ...view}
}

it('should require consent before downloading and generate only after completion', async () => {
  const {result, download, editor} = createHarness()
  await result.generate()
  expect(result.consentOpen()).toBe(true)
  expect(download.startVoiceModel).not.toHaveBeenCalled()
  result.dismissConsent()
  expect(result.consentOpen()).toBe(false)
  await result.generate()
  await result.confirmDownload()
  expect(download.startVoiceModel).toHaveBeenCalledWith('full')
  expect(editor.generate).toHaveBeenCalledOnce()
  expect(result.consentOpen()).toBe(false)
})

it.each<ModelDownloadResult>([{status: 'cancelled'}, {message: '다운로드 실패', status: 'error'}])(
  'should not generate after a $status download',
  async (outcome) => {
    const {result, download, editor} = createHarness()
    vi.mocked(download.startVoiceModel).mockResolvedValue(outcome)
    await result.generate()
    await result.confirmDownload()
    expect(editor.generate).not.toHaveBeenCalled()
    expect(result.message()).toBe(outcome.status === 'error' ? outcome.message : '준비됨')
  },
)

it('should suppress duplicate checks and ignore availability after owner disposal', async () => {
  const {result, editor, cleanup} = createHarness()
  const pending = Promise.withResolvers<boolean>()
  vi.mocked(isSupertonicModelDownloaded).mockReturnValue(pending.promise)
  const generation = result.generate()
  expect(result.busy()).toBe(true)
  await result.generate()
  expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce()
  cleanup()
  pending.resolve(true)
  await generation
  expect(editor.generate).not.toHaveBeenCalled()
  expect(result.consentOpen()).toBe(false)
})

it('should ignore download completion after owner disposal', async () => {
  const {result, download, editor, cleanup} = createHarness()
  const pending = Promise.withResolvers<ModelDownloadResult>()
  vi.mocked(download.startVoiceModel).mockReturnValue(pending.promise)
  await result.generate()
  const confirmation = result.confirmDownload()
  cleanup()
  pending.resolve({status: 'complete'})
  await confirmation
  expect(editor.generate).not.toHaveBeenCalled()
})
