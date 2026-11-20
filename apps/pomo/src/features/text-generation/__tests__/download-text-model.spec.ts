/** @vitest-environment node */
import {sumBy} from 'es-toolkit/math'
import {beforeEach, expect, it, vi} from 'vitest'
import {successResult} from 'src/features/result'
import type {ModelStorage, ModelStorageError} from '../../model-storage'
import {downloadTextModel, type TextModelDownloadRuntime} from '../download-text-model'
import type {TextGenerationProgress} from '../progress'

const createRuntime = () =>
  ({
    isAssetBundled: vi.fn<(url: string) => boolean>(() => false),
    onStorageError: vi.fn<(error: ModelStorageError) => void>(),
    resumable: {
      deletePartial: vi.fn(async (_url: string) => undefined),
      fetch: vi.fn<typeof fetch>(
        async (_input, options) =>
          new Response(options?.method === 'HEAD' ? null : 'data', {
            headers: {'content-length': '4'},
          }),
      ),
    },
    storage: {
      delete: vi.fn<ModelStorage['delete']>(async () => successResult(true)),
      get: vi.fn<ModelStorage['get']>(async () => successResult(null)),
      set: vi.fn<ModelStorage['set']>(async (_url, response) => {
        await response.text()
        return successResult(undefined)
      }),
    },
  }) satisfies TextModelDownloadRuntime

let runtime: ReturnType<typeof createRuntime>
beforeEach(() => {
  runtime = createRuntime()
})

it('should stream every Gemma weight and metadata file into storage without an inference session', async () => {
  const onProgress = vi.fn()
  await downloadTextModel({modelId: 'gemma-4-e2b', onProgress, runtime})
  const urls = runtime.storage.set.mock.calls.map(([url]) => url as string)
  expect(urls).toEqual(
    expect.arrayContaining([
      expect.stringContaining('/onnx/embed_tokens_q4.onnx_data'),
      expect.stringContaining('/onnx/decoder_model_merged_q4.onnx_data'),
      expect.stringContaining('/processor_config.json'),
      expect.stringContaining('/tokenizer.json?pomo-cache-version=1'),
    ]),
  )
  expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({percentage: 100}))
  expect(runtime.resumable.deletePartial).toHaveBeenCalledTimes(urls.length)
})

it('should start persisting a GGUF response before its body finishes downloading', async () => {
  let finish: (() => void) | undefined
  let start: (() => void) | undefined
  const storing = new Promise<void>((resolve) => {
    start = resolve
  })
  runtime.resumable.fetch.mockImplementation(async (input, options) => {
    const url = String(input)
    if (options?.method === 'HEAD' || !url.endsWith('.gguf')) {
      return new Response(options?.method === 'HEAD' ? null : 'data', {
        headers: {'content-length': '4'},
      })
    }
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('gguf'))
          finish = () => controller.close()
        },
      }),
      {headers: {'content-length': '4'}},
    )
  })
  runtime.storage.set.mockImplementation(async (url: string, response: Response) => {
    if (url.endsWith('.gguf')) {
      start?.()
    }
    await response.text()
    return successResult(undefined)
  })
  const download = downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime})
  await storing
  expect(finish).toBeTypeOf('function')
  finish?.()
  await download
  expect(runtime.storage.set.mock.calls.map(([url]) => url)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('/qad/tokenizer.json'),
      expect.stringContaining('/qad/chat_template.jinja'),
    ]),
  )
})

it('should reuse cached files without network requests', async () => {
  runtime.storage.get.mockResolvedValue(
    successResult(new Response('cached', {headers: {'content-length': '6'}})),
  )
  await downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime})
  expect(runtime.resumable.fetch).not.toHaveBeenCalled()
  expect(runtime.storage.set).not.toHaveBeenCalled()
})

it('should report cached bytes and each streamed asset against the complete download size', async () => {
  runtime.storage.get.mockResolvedValueOnce(
    successResult(new Response('cached', {headers: {'content-length': '6'}})),
  )
  const onProgress = vi.fn()

  await downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress, runtime})

  expect(
    onProgress.mock.calls.map(([progress]) => ({
      loadedBytes: progress.loadedBytes,
      totalBytes: progress.totalBytes,
    })),
  ).toEqual([
    {loadedBytes: 6, totalBytes: 22},
    {loadedBytes: 10, totalBytes: 22},
    {loadedBytes: 14, totalBytes: 22},
    {loadedBytes: 18, totalBytes: 22},
    {loadedBytes: 22, totalBytes: 22},
  ])
  expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({percentage: 100}))
})

it('should skip storage and network access for a bundled model', async () => {
  runtime.isAssetBundled.mockReturnValue(true)
  await downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime})
  expect(runtime.storage.get).not.toHaveBeenCalled()
  expect(runtime.storage.set).not.toHaveBeenCalled()
  expect(runtime.resumable.fetch).not.toHaveBeenCalled()
  expect(runtime.resumable.deletePartial).not.toHaveBeenCalled()
})

it.each([
  ['ordinary', ['6', '2', '3', '4', '4']],
  ['unknown totals', ['0', '0', '0', '0', '0']],
  ['negative zero', ['-0', '-0', '-0', '-0', '-0']],
  ['NaN', ['NaN', '2', '3', '4', '4']],
  ['infinity', ['Infinity', '2', '3', '4', '4']],
  ['opposite infinities', ['Infinity', '-Infinity', '3', '4', '4']],
  ['overflow', ['1.7976931348623157e308', '1.7976931348623157e308', '-1', '1', '4']],
  ['rounding order', ['9007199254740992', '1', '-9007199254740992', '1', '4']],
  ['subnormal', ['5e-324', '-5e-324', '0.1', '0.2', '4']],
])('should preserve ordered progress snapshots for %s', async (_name, headers) => {
  let inspected = 0
  runtime.storage.get.mockImplementation(async () => {
    const index = inspected
    inspected += 1
    return successResult(
      index < 4 ? new Response(null, {headers: {'content-length': headers[index]}}) : null,
    )
  })
  runtime.resumable.fetch.mockImplementation(
    async (_input, options) =>
      new Response(
        options?.method === 'HEAD'
          ? null
          : new ReadableStream<Uint8Array>({
              start(controller) {
                for (const size of [0, 1, 3]) {
                  controller.enqueue(new Uint8Array(size))
                }
                controller.close()
              },
            }),
        {headers: {'content-length': headers[4]}},
      ),
  )
  const snapshots: TextGenerationProgress[] = []
  const onProgress = vi.fn((progress: TextGenerationProgress) => {
    expect(runtime.storage.set).toHaveBeenCalledTimes(snapshots.length === 0 ? 0 : 1)
    expect(runtime.resumable.deletePartial).toHaveBeenCalledTimes(snapshots.length === 0 ? 0 : 4)
    snapshots.push(progress)
  })

  await downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress, runtime})

  expect(onProgress).toHaveBeenCalledTimes(4)
  const names = runtime.storage.get.mock.calls.map(([url]) => url)
  const totals = headers.map(Number)
  for (const [index, streamed] of [0, 0, 1, 4].entries()) {
    const progress = snapshots[index]
    const loaded = [...totals.slice(0, 4), streamed]
    const loadedBytes = sumBy(loaded, (value) => value)
    const totalBytes = sumBy(totals, (value) => value)
    expect(progress.loadedBytes).toBe(loadedBytes)
    expect(progress.totalBytes).toBe(totalBytes)
    expect(progress.percentage).toBe(
      totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0,
    )
    expect(Object.keys(progress)).toEqual(['files', 'loadedBytes', 'percentage', 'totalBytes'])
    expect(progress.files).toEqual(
      names.map((fileName, file) => ({
        fileName,
        loadedBytes: loaded[file],
        percentage: totals[file] > 0 ? Math.round((loaded[file] / totals[file]) * 100) : 0,
        totalBytes: totals[file],
      })),
    )
    for (const row of progress.files) {
      expect(Object.keys(row)).toEqual(['fileName', 'loadedBytes', 'percentage', 'totalBytes'])
    }
    if (index > 0) {
      expect(progress).not.toBe(snapshots[index - 1])
      expect(progress.files).not.toBe(snapshots[index - 1].files)
      for (const [file, row] of progress.files.entries()) {
        expect(row).not.toBe(snapshots[index - 1].files[file])
      }
    }
  }
})

it.each([1, 2])('should propagate the error from progress callback %i', async (throwAt) => {
  const error = new Error('progress failed')
  let calls = 0
  const onProgress = () => {
    calls += 1
    if (calls === throwAt) {
      throw error
    }
  }
  const download = downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress, runtime})
  await expect(download).rejects.toBe(error)
  expect(calls).toBe(throwAt)
  expect(runtime.storage.set).toHaveBeenCalledTimes(throwAt - 1)
  expect(runtime.resumable.deletePartial).not.toHaveBeenCalled()
})

it('should report a cache read failure and persist fetched assets', async () => {
  const error = {cause: new Error('cache read failed'), operation: 'read' as const}
  runtime.storage.get.mockResolvedValue({error, ok: false})
  await downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime})
  expect(runtime.onStorageError).toHaveBeenCalledWith(error)
  expect(runtime.storage.set).toHaveBeenCalled()
})

it('should remove the legacy Gemma tokenizer only after its replacement is stored', async () => {
  let start: (() => void) | undefined
  let finish: (() => void) | undefined
  const storing = new Promise<void>((resolve) => {
    start = resolve
  })
  const stored = new Promise<void>((resolve) => {
    finish = resolve
  })
  runtime.storage.set.mockImplementation(async (url: string, response: Response) => {
    await response.text()
    if (url.endsWith('/tokenizer.json?pomo-cache-version=1')) {
      start?.()
      await stored
    }
    return successResult(undefined)
  })
  const download = downloadTextModel({modelId: 'gemma-4-e2b', onProgress: vi.fn(), runtime})
  await storing
  expect(runtime.storage.delete).not.toHaveBeenCalled()
  finish?.()
  await download
  expect(runtime.storage.delete).toHaveBeenCalledOnce()
  expect(runtime.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/\/tokenizer\.json$/u))
})

it('should clean a legacy tokenizer when the replacement is already cached', async () => {
  runtime.storage.get.mockImplementation(async () =>
    successResult(new Response('cached', {headers: {'content-length': '6'}})),
  )
  await downloadTextModel({modelId: 'gemma-4-e2b', onProgress: vi.fn(), runtime})
  expect(runtime.storage.delete).toHaveBeenCalledOnce()
  expect(runtime.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/\/tokenizer\.json$/u))
  expect(runtime.storage.set).not.toHaveBeenCalled()
})

it('should retain the legacy tokenizer when storing its replacement fails', async () => {
  runtime.storage.set.mockImplementation(async (url: string, response: Response) => {
    if (url.endsWith('/tokenizer.json?pomo-cache-version=1')) {
      return {error: {cause: new Error('quota'), operation: 'write'}, ok: false}
    }
    await response.text()
    return successResult(undefined)
  })
  await expect(
    downloadTextModel({modelId: 'gemma-4-e2b', onProgress: vi.fn(), runtime}),
  ).rejects.toThrow('저장')
  expect(runtime.storage.delete).not.toHaveBeenCalled()
})

it('should report a legacy cleanup failure without rejecting the stored model', async () => {
  const error = {cause: new Error('cache busy'), operation: 'delete' as const}
  runtime.storage.delete.mockResolvedValue({error, ok: false})
  await expect(
    downloadTextModel({modelId: 'gemma-4-e2b', onProgress: vi.fn(), runtime}),
  ).resolves.toBeUndefined()
  expect(runtime.onStorageError).toHaveBeenCalledWith(error)
  expect(runtime.resumable.deletePartial).toHaveBeenCalledWith(
    expect.stringMatching(/\/tokenizer\.json$/u),
  )
})

it('should preserve partial bytes and reject completion when a cache write fails', async () => {
  const cause = new Error('quota')
  runtime.storage.set.mockResolvedValue({error: {cause, operation: 'write'}, ok: false})
  await expect(
    downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime}),
  ).rejects.toThrow('저장')
  expect(runtime.resumable.deletePartial).not.toHaveBeenCalled()
})

it('should reject missing required assets but skip optional metadata', async () => {
  runtime.resumable.fetch.mockImplementation(
    async (input, options) =>
      new Response(options?.method === 'HEAD' ? null : 'data', {
        headers: {'content-length': '4'},
        status: String(input).endsWith('generation_config.json') ? 404 : 200,
      }),
  )
  await expect(
    downloadTextModel({modelId: 'lfm-1.2b', onProgress: vi.fn(), runtime}),
  ).resolves.toBeUndefined()
  runtime.resumable.fetch.mockResolvedValue(new Response(null, {status: 404}))
  await expect(
    downloadTextModel({modelId: 'lfm-2.6b-qad', onProgress: vi.fn(), runtime}),
  ).rejects.toThrow('HTTP 404')
})
