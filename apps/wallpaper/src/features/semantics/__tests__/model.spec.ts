/** @vitest-environment jsdom */
import {convertFileSrc, invoke, isTauri} from '@tauri-apps/api/core'
import {afterEach, expect, test, vi} from 'vitest'
import {createSemanticModel} from '../model'

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn(),
  invoke: vi.fn(),
  isTauri: vi.fn(),
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
test('should load native embeddings from the shared cache returned by the app', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(convertFileSrc).mockImplementation((path) => `asset://localhost${path}`)
  vi.mocked(invoke).mockResolvedValue('/cache/semantic-models/revision')
  const message = vi.fn()
  vi.stubGlobal(
    'Worker',
    class {
      onmessage: ((event: MessageEvent) => void) | null = null
      postMessage(request: {readonly id: number}) {
        message(request)
        this.onmessage?.(
          new MessageEvent('message', {data: {id: request.id, type: 'vectors', vectors: [[1]]}}),
        )
      }
      terminate = vi.fn()
    },
  )
  const model = createSemanticModel()
  expect(await model.embed(['hello'])).toEqual([[1]])
  expect(invoke).toHaveBeenCalledWith('prepare_semantic_model')
  expect(convertFileSrc).toHaveBeenCalledWith('/cache/semantic-models/revision')
  expect(message).toHaveBeenCalledWith(
    expect.objectContaining({modelPath: 'asset://localhost/cache/semantic-models/revision/'}),
  )
  model.dispose()
})
test('should avoid creating a worker when disposed while preparing the native cache', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const prepared = Promise.withResolvers<string>()
  vi.mocked(invoke).mockReturnValue(prepared.promise)
  const worker = vi.fn()
  vi.stubGlobal('Worker', worker)
  const model = createSemanticModel()
  const result = model.embed(['hello'])
  model.dispose()
  prepared.resolve('/cache/models')
  await expect(result).rejects.toThrow('종료')
  expect(worker).not.toHaveBeenCalled()
})
