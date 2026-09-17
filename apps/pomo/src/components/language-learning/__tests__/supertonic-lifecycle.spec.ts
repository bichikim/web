/** @vitest-environment node */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createSupertonicClient, type SupertonicClient} from '../../../features/supertonic'
import {runLanguageLearningSupertonic} from '../supertonic-lifecycle'

vi.mock('../../../features/supertonic', () => ({
  createSupertonicClient: vi.fn(),
}))

const initializeResult = {ok: true as const, value: undefined}

let client: SupertonicClient

beforeEach(() => {
  vi.clearAllMocks()
  client = {
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: vi.fn(async () => initializeResult),
  }
  vi.mocked(createSupertonicClient).mockReturnValue(client)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should initialize once, run with the same client, and dispose after completion', async () => {
  const run = vi.fn(async (activeClient: SupertonicClient) => activeClient === client)

  await expect(
    runLanguageLearningSupertonic({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
      run,
    }),
  ).resolves.toEqual({status: 'complete', value: true})
  expect(client.initialize).toHaveBeenCalledOnce()
  expect(run).toHaveBeenCalledOnce()
  expect(client.dispose).toHaveBeenCalledOnce()
})

it('should return initialization failures without running generation', async () => {
  const error = {code: 'cancelled', phase: 'initialize', retryable: false} as const
  vi.mocked(client.initialize).mockResolvedValueOnce({error, ok: false})
  const run = vi.fn(async () => 'generated')

  await expect(
    runLanguageLearningSupertonic({
      modelId: 'int8',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
      run,
    }),
  ).resolves.toEqual({error, status: 'initialization-error'})
  expect(run).not.toHaveBeenCalled()
  expect(client.dispose).toHaveBeenCalledOnce()
})

it('should dispose eagerly on abort and return cancellation', async () => {
  let resolveInitialization: ((value: typeof initializeResult) => void) | undefined
  vi.mocked(client.initialize).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveInitialization = resolve
    }),
  )
  const controller = new AbortController()
  const run = vi.fn(async () => 'generated')
  const operation = runLanguageLearningSupertonic({
    modelId: 'full',
    onProgress: vi.fn(),
    onStatus: vi.fn(),
    run,
    signal: controller.signal,
  })

  controller.abort()
  expect(client.dispose).toHaveBeenCalledOnce()
  resolveInitialization?.(initializeResult)

  await expect(operation).resolves.toEqual({status: 'cancelled'})
  expect(run).not.toHaveBeenCalled()
})

it('should avoid creating a client for an already aborted operation', async () => {
  const controller = new AbortController()
  controller.abort()

  await expect(
    runLanguageLearningSupertonic({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
      run: async () => 'generated',
      signal: controller.signal,
    }),
  ).resolves.toEqual({status: 'cancelled'})
  expect(createSupertonicClient).not.toHaveBeenCalled()
})
