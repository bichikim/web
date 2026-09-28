/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {createTextGenerationExecutor} from '../features/text-generation/execution'
import type {TextGenerationRuntime} from '../features/text-generation/runtime'

const runtimeMocks = vi.hoisted(() => ({
  create: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('../features/text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))

const deviceTarget = {kind: 'device', modelId: 'gemma-4-e2b'} as const

beforeEach(() => {
  vi.clearAllMocks()
  const runtime = {
    countTokens: vi.fn(),
    generate: vi.fn(),
    getTokenizer: vi.fn(),
    prepare: runtimeMocks.prepare,
  } satisfies TextGenerationRuntime
  runtimeMocks.prepare.mockResolvedValue(undefined)
  runtimeMocks.create
    .mockRejectedValueOnce(new Error('transient init failure'))
    .mockResolvedValueOnce(runtime)
})

it('should retry local runtime initialization after a retriable prepare failure', async () => {
  const executor = createTextGenerationExecutor()

  expect(await executor.prepare(deviceTarget)).toEqual({
    error: {
      code: 'execution-failed',
      detail: 'transient init failure',
      phase: 'prepare',
      retryable: true,
    },
    ok: false,
  })

  expect(await executor.prepare(deviceTarget)).toEqual({ok: true, value: undefined})
  expect(runtimeMocks.create).toHaveBeenCalledTimes(2)
})
