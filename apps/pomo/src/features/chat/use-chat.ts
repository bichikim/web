import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

import {type ChatClient, createChatClient, type CreateChatClientOptions} from './client'
import type {ChatAnswerDraft, ChatContext, ChatMessage, ChatWorkerResponse} from './messages'
import {supportsWebGpu} from '../text-generation/environment'
import {createLazyClient} from '../text-generation/lazy-client'
import {getTextModel, type TextModelId} from '../text-generation/model'

interface IdleState {
  readonly status: 'idle'
}

interface LoadingState {
  readonly percentage: number
  readonly status: 'loading'
}

interface ReadyState {
  readonly status: 'ready'
}

interface BusyState {
  readonly status: 'compacting' | 'generating' | 'refining'
}

interface ErrorState {
  readonly message: string
  readonly modelReady: boolean
  readonly status: 'error'
}

interface UnsupportedState {
  readonly status: 'unsupported'
}

export type ChatState =
  | BusyState
  | ErrorState
  | IdleState
  | LoadingState
  | ReadyState
  | UnsupportedState

export interface UseChatProps {
  readonly modelId: TextModelId
  readonly runtime?: ChatRuntime
}

export interface ChatRuntime {
  readonly createClient: (options: CreateChatClientOptions) => ChatClient
  readonly createId: () => string
  readonly supportsWebGpu: () => boolean
}

export interface ChatController {
  readonly answerDraft: Accessor<ChatAnswerDraft | null>
  readonly canClear: Accessor<boolean>
  readonly canPrepare: Accessor<boolean>
  readonly canSend: Accessor<boolean>
  readonly clear: () => void
  readonly contextTokens: Accessor<number>
  readonly draft: Accessor<string>
  readonly isBusy: Accessor<boolean>
  readonly isModelReady: Accessor<boolean>
  readonly messages: Accessor<ReadonlyArray<ChatMessage>>
  readonly modelId: Accessor<TextModelId>
  readonly prepare: () => void
  readonly selectModel: (modelId: TextModelId) => void
  readonly send: (options?: SendChatOptions) => void
  readonly setDraft: (draft: string) => void
  readonly state: Accessor<ChatState>
  readonly statusMessage: Accessor<string>
  readonly streamingText: Accessor<string>
  readonly summaryCount: Accessor<number>
}

export interface SendChatOptions {
  readonly refineAnswer?: boolean
  readonly supplementaryContext?: string
}

const EMPTY_CONTEXT: ChatContext = {messages: [], summary: ''}
const DEFAULT_RUNTIME: ChatRuntime = {
  createClient: createChatClient,
  createId: () => crypto.randomUUID(),
  supportsWebGpu,
}

const getStatusMessage = (state: ChatState, modelId: TextModelId) => {
  const model = getTextModel(modelId)

  switch (state.status) {
    case 'compacting':
      return '오래된 대화를 기억 메모로 압축하고 있어요…'
    case 'error':
      return state.message
    case 'generating':
      return '답변을 만들고 있어요…'
    case 'idle':
      return `${model.downloadSize} 모델을 처음 한 번 내려받아 보관해요.`
    case 'loading':
      return `${model.label} 내려받는 중 · ${state.percentage}%`
    case 'ready':
      return '모델 준비 완료 · 대화는 이 브라우저 안에서 처리돼요.'
    case 'refining':
      return '답변을 마무리하고 있어요…'
    case 'unsupported':
      return '이 브라우저에서는 WebGPU를 사용할 수 없어요. 최신 Chrome 또는 Edge에서 열어 주세요.'
  }

  state satisfies never
}

const isChatBusy = (state: ChatState) => {
  switch (state.status) {
    case 'compacting':
    case 'generating':
    case 'loading':
    case 'refining':
      return true
    case 'error':
    case 'idle':
    case 'ready':
    case 'unsupported':
      return false
  }

  state satisfies never
}

const isChatModelReady = (state: ChatState) => {
  switch (state.status) {
    case 'compacting':
    case 'generating':
    case 'ready':
    case 'refining':
      return true
    case 'error':
      return state.modelReady
    case 'idle':
    case 'loading':
    case 'unsupported':
      return false
  }

  state satisfies never
}

// oxlint-disable-next-line eslint/max-lines-per-function -- One hook owns one disposable chat Worker and its conversation state.
export const useChat = (props: UseChatProps): ChatController => {
  const initialModelId = untrack(() => props.modelId)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [modelId, setModelId] = createSignal(initialModelId)
  const [context, setContext] = createSignal<ChatContext>(EMPTY_CONTEXT)
  const [answerDraft, setAnswerDraft] = createSignal<ChatAnswerDraft | null>(null)
  const [messages, setMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [draft, setDraft] = createSignal('')
  const [streamingText, setStreamingText] = createSignal('')
  const [contextTokens, setContextTokens] = createSignal(0)
  const [summaryCount, setSummaryCount] = createSignal(0)
  const [state, setState] = createSignal<ChatState>(
    runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'},
  )
  let pendingUser: ChatMessage | null = null

  const isBusy = createMemo(() => isChatBusy(state()))
  const isModelReady = createMemo(() => isChatModelReady(state()))
  const canPrepare = createMemo(() => {
    const currentState = state()
    return (
      currentState.status === 'idle' ||
      (currentState.status === 'error' && !currentState.modelReady)
    )
  })
  const canSend = createMemo(() => isModelReady() && !isBusy() && draft().trim().length > 0)
  const canClear = createMemo(() => !isBusy() && messages().length > 0)
  const statusMessage = createMemo(() => getStatusMessage(state(), modelId()))

  const handleResponse = (response: ChatWorkerResponse) => {
    switch (response.type) {
      case 'compacting':
        setState({status: 'compacting'})
        return
      case 'complete':
        setContext(response.context)
        setContextTokens(response.contextTokens)
        setMessages((value) => [...value, response.message])
        setStreamingText('')
        setSummaryCount((value) => value + (response.wasCompacted ? 1 : 0))
        pendingUser = null
        setState({status: 'ready'})
        return
      case 'draft':
        setAnswerDraft(response.draft)
        return
      case 'error': {
        const modelReady = !response.restartRequired && isModelReady()

        if (pendingUser !== null) {
          const failedUser = pendingUser
          setDraft(failedUser.content)
          setMessages((value) => value.filter((message) => message.id !== failedUser.id))
          setContext((value) => ({
            ...value,
            messages: value.messages.filter((message) => message.id !== failedUser.id),
          }))
          pendingUser = null
        }
        if (response.restartRequired) {
          clientOwner.dispose()
        }

        setStreamingText('')
        setAnswerDraft(null)
        setState({message: response.message, modelReady, status: 'error'})
        return
      }
      case 'loading':
        setState({percentage: response.percentage, status: 'loading'})
        return
      case 'ready':
        setState({status: 'ready'})
        return
      case 'refining':
        setState({status: 'refining'})
        return
      case 'started':
        setContextTokens(response.contextTokens)
        setState({status: 'generating'})
        return
      case 'token':
        setStreamingText((value) => value + response.text)
        return
    }

    response satisfies never
  }

  const clientOwner = createLazyClient(() =>
    runtime.createClient({modelId: modelId(), onResponse: handleResponse}),
  )

  const selectModel = (nextModelId: TextModelId) => {
    if (nextModelId === modelId() || isBusy()) {
      return
    }

    clientOwner.dispose()
    pendingUser = null
    setModelId(nextModelId)
    setAnswerDraft(null)
    setStreamingText('')
    setContextTokens(0)
    setState(runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'})
  }

  const prepare = () => {
    if (!canPrepare() || !runtime.supportsWebGpu()) {
      return
    }

    setState({percentage: 0, status: 'loading'})
    clientOwner.get().prepare()
  }

  const send = (options: SendChatOptions = {}) => {
    if (!canSend()) {
      return
    }

    const userMessage: ChatMessage = {
      content: draft().trim(),
      id: runtime.createId(),
      role: 'user',
    }
    const nextContext = {...context(), messages: [...context().messages, userMessage]}
    pendingUser = userMessage
    setMessages((value) => [...value, userMessage])
    setContext(nextContext)
    setDraft('')
    setAnswerDraft(null)
    setStreamingText('')
    setState({status: 'generating'})
    clientOwner.get().generate(nextContext, runtime.createId(), {
      refineAnswer: options.refineAnswer ?? true,
      ...(options.supplementaryContext === undefined
        ? {}
        : {supplementaryContext: options.supplementaryContext}),
    })
  }

  const clear = () => {
    if (!canClear()) {
      return
    }

    setContext(EMPTY_CONTEXT)
    setAnswerDraft(null)
    setMessages([])
    setStreamingText('')
    setContextTokens(0)
    setSummaryCount(0)
  }

  onCleanup(clientOwner.dispose)

  return {
    answerDraft,
    canClear,
    canPrepare,
    canSend,
    clear,
    contextTokens,
    draft,
    isBusy,
    isModelReady,
    messages,
    modelId,
    prepare,
    selectModel,
    send,
    setDraft,
    state,
    statusMessage,
    streamingText,
    summaryCount,
  }
}
