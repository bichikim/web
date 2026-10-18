/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {ContextSidebar} from '../../../components/chat-room/ContextSidebar'
import {type ChatVoiceController} from '../../chat-voice'
import {
  type ChatClient,
  type ChatController,
  type ChatRuntime,
  type ChatWorkerResponse,
  useChat,
} from '../index'

interface ChatStatusRuntime {
  readonly client: ChatClient
  readonly respond: (response: ChatWorkerResponse) => void
  readonly runtime: ChatRuntime
}

interface ChatStatusHarnessProps {
  readonly onChatCreated: (chat: ChatController) => void
  readonly runtime: ChatRuntime
}

const voice: ChatVoiceController = {
  activeViseme: () => 'rest',
  arm: () => undefined,
  canPrepare: () => false,
  finish: async () => undefined,
  isGenerating: () => false,
  isPlaying: () => false,
  prepare: async () => undefined,
  speak: async () => undefined,
  state: () => ({message: '', status: 'ready'}),
  statusMessage: () => '',
  stop: () => undefined,
}

const ChatStatusHarness = (props: ChatStatusHarnessProps) => {
  const chat = useChat({modelId: 'qwen-4b', runtime: props.runtime})
  props.onChatCreated(chat)

  return (
    <ContextSidebar
      chat={chat}
      disableRefining={false}
      modelLabel="Qwen3.5-4B"
      onClear={chat.clear}
      onDisableRefiningChange={() => undefined}
      onPrepare={chat.prepare}
      onSpeakBeforeRefiningChange={() => undefined}
      speakBeforeRefining={false}
      voice={voice}
    />
  )
}

const createRuntime = (): ChatStatusRuntime => {
  let handleResponse: ((response: ChatWorkerResponse) => void) | undefined
  const client: ChatClient = {
    dispose: vi.fn(),
    generate: vi.fn(),
    prepare: vi.fn(),
  }
  const runtime: ChatRuntime = {
    createClient: (options) => {
      handleResponse = options.onResponse
      return client
    },
    createId: () => 'chat-id-1',
    supportsWebGpu: () => true,
  }

  return {
    client,
    respond: (response) => {
      if (handleResponse === undefined) {
        throw new Error('Chat client was not created.')
      }

      handleResponse(response)
    },
    runtime,
  }
}

const mountStatusConsumer = (runtime: ChatRuntime) => {
  let chat: ChatController | undefined
  const view = render(() => (
    <ChatStatusHarness onChatCreated={(controller) => (chat = controller)} runtime={runtime} />
  ))

  if (chat === undefined) {
    throw new Error('Chat controller was not created.')
  }

  return {chat, unmount: view.unmount}
}

const createLoadingResponse = (percentage: number) =>
  ({
    files: [],
    loadedBytes: percentage,
    percentage,
    totalBytes: 100,
    type: 'loading',
  }) satisfies ChatWorkerResponse

const startPreparing = () => {
  const testRuntime = createRuntime()
  const view = mountStatusConsumer(testRuntime.runtime)
  fireEvent.click(screen.getByRole('button', {name: 'Qwen3.5-4B 준비하기'}))

  return {...testRuntime, ...view}
}

const emitUnknownLoadingResponse = (respond: ChatStatusRuntime['respond']) => {
  const response = {
    files: [],
    loadedBytes: 100,
    totalBytes: 100,
    type: 'loading',
  } as unknown as ChatWorkerResponse

  respond(response)
}

describe('useChat status message', () => {
  it('should clamp visible finite progress while preserving raw worker state', () => {
    const {chat, respond, unmount} = startPreparing()
    const overLimit = createLoadingResponse(120)
    respond(overLimit)

    expect(chat.state()).toEqual({percentage: 120, status: 'loading'})
    expect(overLimit.percentage).toBe(120)
    expect(screen.getByText('Qwen3.5-4B 내려받는 중 · 100%')).toBeInTheDocument()
    expect(screen.queryByText('Qwen3.5-4B 내려받는 중 · 120%')).not.toBeInTheDocument()
    expect(chat.isModelReady()).toBe(false)

    const atLimit = createLoadingResponse(100)
    respond(atLimit)

    expect(chat.state()).toEqual({percentage: 100, status: 'loading'})
    expect(atLimit.percentage).toBe(100)
    expect(screen.getByText('Qwen3.5-4B 내려받는 중 · 100%')).toBeInTheDocument()
    expect(chat.isModelReady()).toBe(false)

    const negative = createLoadingResponse(-5)
    respond(negative)

    expect(chat.state()).toEqual({percentage: -5, status: 'loading'})
    expect(negative.percentage).toBe(-5)
    expect(screen.getByText('Qwen3.5-4B 내려받는 중 · 0%')).toBeInTheDocument()
    expect(screen.queryByText('Qwen3.5-4B 내려받는 중 · -5%')).not.toBeInTheDocument()
    expect(chat.isModelReady()).toBe(false)
    unmount()
  })

  it('should follow explicit ready and error responses and release the client on unmount', () => {
    const {chat, client, respond, unmount} = startPreparing()
    respond(createLoadingResponse(100))

    expect(chat.state()).toEqual({percentage: 100, status: 'loading'})
    expect(chat.isModelReady()).toBe(false)

    respond({type: 'ready'})

    expect(chat.state()).toEqual({status: 'ready'})
    expect(
      screen.getByText('모델 준비 완료 · 대화는 이 브라우저 안에서 처리돼요.'),
    ).toBeInTheDocument()
    expect(chat.isModelReady()).toBe(true)

    respond({message: '모델 생성 오류', restartRequired: false, type: 'error'})

    expect(chat.state()).toEqual({message: '모델 생성 오류', modelReady: true, status: 'error'})
    expect(screen.getByText('모델 생성 오류')).toBeInTheDocument()
    expect(chat.isModelReady()).toBe(true)
    unmount()
    expect(client.dispose).toHaveBeenCalledOnce()
  })

  it.each([
    {label: 'missing', percentage: undefined},
    {label: 'NaN', percentage: Number.NaN},
    {label: 'positive infinity', percentage: Number.POSITIVE_INFINITY},
    {label: 'negative infinity', percentage: Number.NEGATIVE_INFINITY},
  ])('should omit $label progress from the loading status message', ({percentage}) => {
    const {chat, respond, unmount} = startPreparing()

    if (percentage === undefined) {
      emitUnknownLoadingResponse(respond)
    } else {
      respond(createLoadingResponse(percentage))
    }

    expect(chat.state()).toStrictEqual({percentage, status: 'loading'})
    expect(screen.getByText('Qwen3.5-4B 내려받는 중')).toBeInTheDocument()
    expect(chat.isBusy()).toBe(true)
    expect(chat.isModelReady()).toBe(false)
    unmount()
  })
})
