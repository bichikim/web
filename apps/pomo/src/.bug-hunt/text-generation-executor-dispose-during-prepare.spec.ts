/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createTextGenerationExecutor,
  type TextGenerationExecutionProvider,
} from '../features/text-generation/execution'

const serverTarget = {
  kind: 'server',
  modelId: 'gpt-5.6-luna',
  provider: 'openai',
} as const

describe('text generation executor dispose during prepare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject prepare that finishes after dispose', async () => {
    let resolvePrepare: (() => void) | undefined
    const prepareGate = new Promise<void>((resolve) => {
      resolvePrepare = resolve
    })

    const provider: TextGenerationExecutionProvider = {
      cancel: vi.fn(),
      countTokens: vi.fn(),
      dispose: vi.fn(),
      generate: vi.fn(),
      getTokenizer: vi.fn(),
      prepare: vi.fn(async () => {
        await prepareGate
      }),
    }

    const executor = createTextGenerationExecutor({
      createServerProvider: () => provider,
    })
    const preparePromise = executor.prepare(serverTarget)

    executor.dispose()
    resolvePrepare?.()

    await expect(preparePromise).resolves.toEqual({
      error: {code: 'cancelled', phase: 'prepare', retryable: false},
      ok: false,
    })
  })

  it('should reject countTokens that finishes after dispose', async () => {
    let resolveCount: (() => void) | undefined
    const countGate = new Promise<void>((resolve) => {
      resolveCount = resolve
    })

    const provider: TextGenerationExecutionProvider = {
      cancel: vi.fn(),
      countTokens: vi.fn(async () => {
        await countGate
        return 12
      }),
      dispose: vi.fn(),
      generate: vi.fn(),
      getTokenizer: vi.fn(),
      prepare: vi.fn(),
    }

    const executor = createTextGenerationExecutor({
      createServerProvider: () => provider,
    })
    const countPromise = executor.countTokens(serverTarget, [{content: '안녕', role: 'user'}])

    executor.dispose()
    resolveCount?.()

    await expect(countPromise).resolves.toEqual({
      error: {code: 'cancelled', phase: 'count-tokens', retryable: false},
      ok: false,
    })
  })
})
