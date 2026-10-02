/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {type ChatClient, type ChatRuntime, type ChatWorkerResponse, useChat} from '../features/chat'

const moduleMocks = vi.hoisted(() => ({
  createChatClient: vi.fn(),
  supportsWebGpu: vi.fn(),
}))

vi.mock('../features/chat/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/chat/client')>()
  return {...actual, createChatClient: moduleMocks.createChatClient}
})

vi.mock('../features/text-generation/environment', () => ({
  supportsWebGpu: moduleMocks.supportsWebGpu,
}))

const createRuntime = () => {
  let respond: ((response: ChatWorkerResponse) => void) | null = null
  const runtime: ChatRuntime = {
    createClient: (options) => {
      respond = options.onResponse
      const client: ChatClient = {
        dispose: vi.fn(),
        generate: vi.fn(),
        prepare: vi.fn(),
      }
      return client
    },
    createId: () => 'chat-id-1',
    supportsWebGpu: () => true,
  }

  return {
    emit: (response: ChatWorkerResponse) => {
      if (respond === null) {
        throw new Error('Chat client was not created.')
      }
      respond(response)
    },
    runtime,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  moduleMocks.supportsWebGpu.mockReturnValue(true)
})

it('should cap model download percentage in the loading status message', () => {
  const testRuntime = createRuntime()
  const {cleanup, result} = renderHook(() =>
    useChat({modelId: 'qwen-4b', runtime: testRuntime.runtime}),
  )

  result.prepare()
  testRuntime.emit({
    files: [],
    loadedBytes: 120,
    percentage: 120,
    totalBytes: 100,
    type: 'loading',
  })

  expect(result.statusMessage()).toContain('100%')
  expect(result.statusMessage()).not.toContain('120%')
  cleanup()
})
