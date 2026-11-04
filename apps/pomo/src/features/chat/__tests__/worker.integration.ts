/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {loadWorker, runtimeMocks} from './fixtures/worker'

const WORKER_IMPORT_TEST_TIMEOUT_MILLISECONDS = 30_000

describe('chat worker preparation', () => {
  it(
    'should cache the runtime and forward loading progress while preparing models',
    async () => {
      const worker = await loadWorker()

      await worker.dispatchAndWaitForResponse({modelId: 'qwen-4b', type: 'prepare'}, 'ready')
      const createOptions = runtimeMocks.create.mock.calls[0]?.[0]
      createOptions?.onProgress({file: 'model', progress: 0.5, status: 'progress'})
      await worker.dispatchAndWaitForResponse({modelId: 'gemma-4-e2b', type: 'prepare'}, 'ready')

      expect(runtimeMocks.create).toHaveBeenCalledOnce()
      expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(1, 'qwen-4b')
      expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(2, 'gemma-4-e2b')
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          file: 'model',
          progress: 0.5,
          status: 'progress',
          type: 'loading',
        }),
      )
    },
    WORKER_IMPORT_TEST_TIMEOUT_MILLISECONDS,
  )
})
