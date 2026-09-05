/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type ChatClient, type ChatRuntime, type ChatWorkerResponse, useChat} from '../index'

const moduleMocks = vi.hoisted(() => ({
  createChatClient: vi.fn(),
  supportsWebGpu: vi.fn(),
}))

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>()

  return {...actual, createChatClient: moduleMocks.createChatClient}
})

vi.mock('../../text-generation/environment', () => ({
  supportsWebGpu: moduleMocks.supportsWebGpu,
}))

interface ClientRecord {
  readonly client: ChatClient
  readonly modelId: string
  readonly respond: (response: ChatWorkerResponse) => void
}

const createRuntime = () => {
  const clients: Array<ClientRecord> = []
  let nextId = 0
  const supportsWebGpu = vi.fn(() => true)
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
    supportsWebGpu,
  }
  return {clients, runtime, supportsWebGpu}
}

beforeEach(() => {
  vi.clearAllMocks()
  moduleMocks.createChatClient.mockReset()
  moduleMocks.supportsWebGpu.mockReset().mockReturnValue(false)
})

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

  it('should forward transient supplementary context without storing it in conversation history', () => {
    const {clients, runtime} = createRuntime()
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))
    result.prepare()
    const clientRecord = clients[0]
    clientRecord?.respond({type: 'ready'})
    result.setDraft('오늘 일정 알려줘')

    result.send({supplementaryContext: '캘린더 조회 결과'})

    expect(clientRecord?.client.generate).toHaveBeenCalledWith(
      {
        messages: [{content: '오늘 일정 알려줘', id: 'id-1', role: 'user'}],
        summary: '',
      },
      'id-2',
      {refineAnswer: true, supplementaryContext: '캘린더 조회 결과'},
    )
    expect(result.messages()).toEqual([{content: '오늘 일정 알려줘', id: 'id-1', role: 'user'}])
    cleanup()
  })

  it('should expose unsupported state and keep preparation disabled without WebGPU', () => {
    const {clients, runtime, supportsWebGpu} = createRuntime()
    supportsWebGpu.mockReturnValue(false)
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))

    expect(result.state()).toEqual({status: 'unsupported'})
    expect(result.statusMessage()).toBe(
      '이 브라우저에서는 WebGPU를 사용할 수 없어요. 최신 Chrome 또는 Edge에서 열어 주세요.',
    )
    expect(result.isBusy()).toBe(false)
    expect(result.isModelReady()).toBe(false)
    expect(result.canPrepare()).toBe(false)
    expect(result.canSend()).toBe(false)
    expect(result.canClear()).toBe(false)

    result.prepare()
    result.selectModel('qwen-4b')
    result.selectModel('gemma-4-e2b-mobile')

    expect(clients).toHaveLength(0)
    expect(result.modelId()).toBe('gemma-4-e2b-mobile')
    expect(result.state()).toEqual({status: 'unsupported'})
    cleanup()
  })

  it('should reflect every generation phase and clear a completed conversation', () => {
    const {clients, runtime, supportsWebGpu} = createRuntime()
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))

    expect(result.state()).toEqual({status: 'idle'})
    expect(result.statusMessage()).toBe('약 3.3GB 모델을 처음 한 번 내려받아 보관해요.')
    expect(result.isBusy()).toBe(false)
    expect(result.isModelReady()).toBe(false)
    expect(result.canPrepare()).toBe(true)

    supportsWebGpu.mockReturnValue(false)
    result.prepare()
    expect(clients).toHaveLength(0)

    supportsWebGpu.mockReturnValue(true)
    result.prepare()
    const clientRecord = clients[0]

    expect(clientRecord?.client.prepare).toHaveBeenCalledOnce()
    expect(result.state()).toEqual({percentage: 0, status: 'loading'})
    expect(result.statusMessage()).toBe('Qwen3.5-4B 내려받는 중 · 0%')
    expect(result.isBusy()).toBe(true)
    expect(result.isModelReady()).toBe(false)
    expect(result.canPrepare()).toBe(false)
    result.prepare()
    result.selectModel('gemma-4-e2b-mobile')
    result.send()
    result.clear()
    expect(clientRecord?.client.prepare).toHaveBeenCalledOnce()
    expect(result.modelId()).toBe('qwen-4b')

    clientRecord?.respond({
      files: [],
      loadedBytes: 37,
      percentage: 37,
      totalBytes: 100,
      type: 'loading',
    })
    expect(result.statusMessage()).toBe('Qwen3.5-4B 내려받는 중 · 37%')

    clientRecord?.respond({type: 'ready'})
    expect(result.statusMessage()).toBe('모델 준비 완료 · 대화는 이 브라우저 안에서 처리돼요.')
    expect(result.isBusy()).toBe(false)
    expect(result.isModelReady()).toBe(true)
    expect(result.canPrepare()).toBe(false)
    result.setDraft('   ')
    expect(result.canSend()).toBe(false)
    result.setDraft('  질문  ')
    expect(result.canSend()).toBe(true)

    result.send()
    expect(clientRecord?.client.generate).toHaveBeenCalledWith(
      {
        messages: [{content: '질문', id: 'id-1', role: 'user'}],
        summary: '',
      },
      'id-2',
      {refineAnswer: true},
    )
    expect(result.statusMessage()).toBe('답변을 만들고 있어요…')
    expect(result.isBusy()).toBe(true)
    expect(result.isModelReady()).toBe(true)
    expect(result.canClear()).toBe(false)

    clientRecord?.respond({contextTokens: 14, type: 'started', wasCompacted: false})
    expect(result.contextTokens()).toBe(14)
    clientRecord?.respond({text: '첫', type: 'token'})
    clientRecord?.respond({text: ' 답변', type: 'token'})
    expect(result.streamingText()).toBe('첫 답변')

    clientRecord?.respond({type: 'compacting'})
    expect(result.statusMessage()).toBe('오래된 대화를 기억 메모로 압축하고 있어요…')
    expect(result.isBusy()).toBe(true)
    expect(result.isModelReady()).toBe(true)

    clientRecord?.respond({draft: {content: '초안', id: 'draft-1'}, type: 'draft'})
    expect(result.answerDraft()).toEqual({content: '초안', id: 'draft-1'})
    clientRecord?.respond({type: 'refining'})
    expect(result.statusMessage()).toBe('답변을 마무리하고 있어요…')
    expect(result.isBusy()).toBe(true)
    expect(result.isModelReady()).toBe(true)

    const assistantMessage = {content: '최종 답변', id: 'assistant-1', role: 'assistant'} as const
    clientRecord?.respond({
      context: {
        messages: [{content: '질문', id: 'id-1', role: 'user'}, assistantMessage],
        summary: '이전 요약',
      },
      contextTokens: 8,
      message: assistantMessage,
      type: 'complete',
      wasCompacted: true,
    })

    expect(result.messages()).toEqual([
      {content: '질문', id: 'id-1', role: 'user'},
      assistantMessage,
    ])
    expect(result.streamingText()).toBe('')
    expect(result.contextTokens()).toBe(8)
    expect(result.summaryCount()).toBe(1)
    expect(result.canClear()).toBe(true)

    result.clear()
    expect(result.messages()).toEqual([])
    expect(result.answerDraft()).toBeNull()
    expect(result.contextTokens()).toBe(0)
    expect(result.streamingText()).toBe('')
    expect(result.summaryCount()).toBe(0)
    expect(result.canClear()).toBe(false)
    result.clear()
    cleanup()
  })

  it('should restore a pending question after a recoverable generation error', () => {
    const {clients, runtime} = createRuntime()
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))
    result.prepare()
    const clientRecord = clients[0]
    clientRecord?.respond({type: 'ready'})
    result.setDraft('  다시 시도할 질문  ')

    result.send({refineAnswer: false})
    clientRecord?.respond({text: '부분 답변', type: 'token'})
    clientRecord?.respond({draft: {content: '임시 초안', id: 'draft-1'}, type: 'draft'})
    clientRecord?.respond({
      message: '생성에 실패했어요.',
      restartRequired: false,
      type: 'error',
    })

    expect(result.state()).toEqual({
      message: '생성에 실패했어요.',
      modelReady: true,
      status: 'error',
    })
    expect(result.statusMessage()).toBe('생성에 실패했어요.')
    expect(result.isBusy()).toBe(false)
    expect(result.isModelReady()).toBe(true)
    expect(result.canPrepare()).toBe(false)
    expect(result.draft()).toBe('다시 시도할 질문')
    expect(result.messages()).toEqual([])
    expect(result.streamingText()).toBe('')
    expect(result.answerDraft()).toBeNull()
    expect(clientRecord?.client.dispose).not.toHaveBeenCalled()
    expect(clientRecord?.client.generate).toHaveBeenCalledWith(expect.any(Object), 'id-2', {
      refineAnswer: false,
    })

    result.send({refineAnswer: false})
    expect(clientRecord?.client.generate).toHaveBeenLastCalledWith(
      {
        messages: [{content: '다시 시도할 질문', id: 'id-3', role: 'user'}],
        summary: '',
      },
      'id-4',
      {refineAnswer: false},
    )
    cleanup()
  })

  it('should distinguish recoverable loading errors from restart-required errors', () => {
    const {clients, runtime} = createRuntime()
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b', runtime}))
    result.prepare()
    const clientRecord = clients[0]

    clientRecord?.respond({message: '일시 오류', restartRequired: false, type: 'error'})
    expect(result.state()).toEqual({message: '일시 오류', modelReady: false, status: 'error'})
    expect(result.isModelReady()).toBe(false)
    expect(result.canPrepare()).toBe(true)
    expect(clientRecord?.client.dispose).not.toHaveBeenCalled()

    result.prepare()
    expect(clientRecord?.client.prepare).toHaveBeenCalledTimes(2)
    clientRecord?.respond({type: 'ready'})
    clientRecord?.respond({message: '재시작 필요', restartRequired: true, type: 'error'})

    expect(clientRecord?.client.dispose).toHaveBeenCalledOnce()
    expect(result.state()).toEqual({message: '재시작 필요', modelReady: false, status: 'error'})
    expect(result.isModelReady()).toBe(false)
    expect(result.canPrepare()).toBe(true)
    cleanup()
  })

  it('should use the default browser runtime to prepare and send a question', () => {
    moduleMocks.supportsWebGpu.mockReturnValue(true)
    const client: ChatClient = {
      dispose: vi.fn(),
      generate: vi.fn(),
      prepare: vi.fn(),
    }
    let respond: ((response: ChatWorkerResponse) => void) | undefined
    moduleMocks.createChatClient.mockImplementation((options) => {
      respond = options.onResponse
      return client
    })
    const {cleanup, result} = renderHook(() => useChat({modelId: 'qwen-4b'}))

    result.prepare()
    respond?.({type: 'ready'})
    result.setDraft('기본 런타임 질문')
    result.send({})

    expect(moduleMocks.createChatClient).toHaveBeenCalledOnce()
    expect(client.prepare).toHaveBeenCalledOnce()
    const generateCall = vi.mocked(client.generate).mock.calls[0]

    expect(generateCall?.[0].messages).toEqual([
      {content: '기본 런타임 질문', id: expect.any(String), role: 'user'},
    ])
    expect(generateCall?.[1]).toEqual(expect.any(String))
    expect(generateCall?.[2]).toEqual({refineAnswer: true})
    cleanup()
    expect(client.dispose).toHaveBeenCalledOnce()
  })

  it('should leave exhaustive fallthroughs inert for unexpected runtime values', async () => {
    vi.resetModules()
    vi.doMock('solid-js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('solid-js')>()
      const createMemo = <Value>(calculation: () => Value) => calculation

      return {...actual, createMemo}
    })
    const {useChat: useChatWithLazyMemos} = await import('../use-chat')
    const {clients, runtime} = createRuntime()
    const {cleanup, result} = renderHook(() => useChatWithLazyMemos({modelId: 'qwen-4b', runtime}))
    result.prepare()
    const clientRecord = clients[0]

    clientRecord?.respond({type: 'unexpected'} as unknown as ChatWorkerResponse)
    const currentState = result.state()
    Object.defineProperty(currentState, 'status', {value: 'unexpected'})

    expect(result.statusMessage()).toBeUndefined()
    expect(result.isBusy()).toBeUndefined()
    expect(result.isModelReady()).toBeUndefined()
    cleanup()
    vi.doUnmock('solid-js')
  })
})
