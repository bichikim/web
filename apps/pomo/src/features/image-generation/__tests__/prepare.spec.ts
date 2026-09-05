import {beforeEach, expect, it, vi} from 'vitest'
import {isTextModelDownloaded} from '../../text-generation'
import {createModelDownloadController, type ModelDownloadResult} from '../../model-download'
import {prepareImageModels} from '../prepare'

vi.mock('../../text-generation', () => ({isTextModelDownloaded: vi.fn()}))
beforeEach(() => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
})

const setup = () => {
  const downloads = createModelDownloadController()
  vi.spyOn(downloads, 'startTextModel').mockResolvedValue({status: 'complete'})
  vi.spyOn(downloads, 'startImageModel').mockResolvedValue({status: 'complete'})
  vi.spyOn(downloads, 'cancel')
  return {
    downloads,
    modelId: 'gemma-4-e2b' as const,
    signal: new AbortController().signal,
    variant: 'ternary' as const,
  }
}

it('should queue both model downloads before waiting for either one', async () => {
  const options = setup()
  const pending = Promise.withResolvers<ModelDownloadResult>()
  vi.mocked(options.downloads.startTextModel).mockReturnValue(pending.promise)
  const task = prepareImageModels(options)
  await vi.waitFor(() => expect(options.downloads.startImageModel).toHaveBeenCalledWith('ternary'))
  expect(options.downloads.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
  pending.resolve({status: 'complete'})
  await task
})

it('should reuse a cached text model', async () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  const options = setup()
  await prepareImageModels(options)
  expect(options.downloads.startTextModel).not.toHaveBeenCalled()
  expect(options.downloads.startImageModel).toHaveBeenCalledOnce()
})

it('should stop the remaining download when either model fails', async () => {
  const options = setup()
  vi.mocked(options.downloads.startImageModel).mockReturnValue(new Promise(() => {}))
  vi.mocked(options.downloads.startTextModel).mockResolvedValue({
    message: 'Download failed',
    status: 'error',
  })
  await expect(prepareImageModels(options)).rejects.toThrow('Download failed')
  expect(options.downloads.cancel).toHaveBeenCalledWith({kind: 'image', modelId: 'ternary'})
})

it('should cancel queued models on abort and remove the listener afterward', async () => {
  const options = setup()
  const abort = new AbortController()
  const pending = Promise.withResolvers<ModelDownloadResult>()
  vi.mocked(options.downloads.startImageModel).mockReturnValue(pending.promise)
  vi.mocked(options.downloads.cancel).mockImplementation(() =>
    pending.resolve({status: 'cancelled'}),
  )
  const task = prepareImageModels({...options, signal: abort.signal})
  const assertion = expect(task).rejects.toMatchObject({name: 'AbortError'})
  await vi.waitFor(() => expect(options.downloads.startImageModel).toHaveBeenCalledOnce())
  abort.abort()
  await assertion
  expect(options.downloads.cancel).not.toHaveBeenCalledWith({kind: 'text', modelId: 'gemma-4-e2b'})
})
