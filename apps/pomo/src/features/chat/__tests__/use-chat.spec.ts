/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {type ChatClient, type ChatRuntime, type ChatWorkerResponse, useChat} from '../index'

interface ClientRecord {
  readonly client: ChatClient
  readonly modelId: string
  readonly respond: (response: ChatWorkerResponse) => void
}

const createRuntime = () => {
  const clients: Array<ClientRecord> = []
  let nextId = 0
  const runtime: ChatRuntime = {
    createClient: (options) => {
      const client: ChatClient = {
        dispose: vi.fn(),
        generate: vi.fn(),
        prepare: vi.fn(),
      }
      clients.push({client, modelId: options.modelId, respond: options.onResponse})
      return client
    },
    createId: () => {
      nextId += 1
      return `id-${nextId}`
    },
    supportsWebGpu: () => true,
  }
  return {clients, runtime}
}

describe('useChat', () => {
  it('should preserve conversation while replacing the model client', () => {
    const {clients, runtime} = createRuntime()
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))

    result.prepare()
    const firstClient = clients[0]

    expect(firstClient?.modelId).toBe('qwen-4b')
    firstClient?.respond({type: 'ready'})
    result.setDraft('안녕')
    result.send()
    firstClient?.respond({
      context: {
        messages: [
          {content: '안녕', id: 'id-1', role: 'user'},
          {content: '반가워요', id: 'id-3', role: 'assistant'},
        ],
        summary: '',
      },
      contextTokens: 12,
      message: {content: '반가워요', id: 'id-3', role: 'assistant'},
      type: 'complete',
      wasCompacted: false,
    })

    result.selectModel('gemma-4-e2b-mobile')

    expect(firstClient?.client.dispose).toHaveBeenCalledOnce()
    expect(result.modelId()).toBe('gemma-4-e2b-mobile')
    expect(result.messages().map((message) => message.content)).toEqual(['안녕', '반가워요'])
    expect(result.contextTokens()).toBe(0)
    expect(result.state()).toEqual({status: 'idle'})

    result.prepare()
    expect(clients[1]?.modelId).toBe('gemma-4-e2b-mobile')
    cleanup()
  })
})
