import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

import {createQwenClient, type CreateQwenClientOptions, type QwenClient} from './client'
import type {QwenProgress, QwenWorkerResponse} from './messages'
import type {QwenModelId} from './model'

const INITIAL_STATUS_MESSAGE = '모델은 처음 한 번만 내려받고 브라우저 캐시에 보관해요.'

interface IdleState {
  readonly status: 'idle'
}

interface LoadingState extends QwenProgress {
  readonly status: 'loading'
}

interface ReadyState {
  readonly status: 'complete' | 'generating' | 'ready'
}

interface ErrorState {
  readonly message: string
  readonly modelReady: boolean
  readonly status: 'error'
}

interface UnsupportedState {
  readonly status: 'unsupported'
}

export type QwenDialogueState =
  | ErrorState
  | IdleState
  | LoadingState
  | ReadyState
  | UnsupportedState

export interface UseQwenDialogueWriterProps {
  readonly initialRequest?: string
  readonly modelId: QwenModelId
  readonly runtime?: QwenDialogueRuntime
}

export interface QwenDialogueRuntime {
  readonly createClient: (options: CreateQwenClientOptions) => QwenClient
  readonly supportsWebGpu: () => boolean
}

export interface QwenDialogueWriterController {
  readonly canCopy: Accessor<boolean>
  readonly canGenerate: Accessor<boolean>
  readonly canPrepare: Accessor<boolean>
  readonly copyOutput: () => Promise<void>
  readonly generate: () => void
  readonly output: Accessor<string>
  readonly prepare: () => void
  readonly release: () => void
  readonly request: Accessor<string>
  readonly setRequest: (request: string) => void
  readonly state: Accessor<QwenDialogueState>
  readonly statusMessage: Accessor<string>
}

const supportsWebGpu = () => typeof navigator !== 'undefined' && 'gpu' in navigator
const DEFAULT_RUNTIME: QwenDialogueRuntime = {createClient: createQwenClient, supportsWebGpu}

export const useQwenDialogueWriter = (
  props: UseQwenDialogueWriterProps,
): QwenDialogueWriterController => {
  const initialRequest = untrack(() => props.initialRequest ?? '')
  const modelId = untrack(() => props.modelId)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [request, setRequest] = createSignal(initialRequest)
  const [output, setOutput] = createSignal('')
  const [state, setState] = createSignal<QwenDialogueState>(
    runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'},
  )
  let client: QwenClient | null = null

  const isBusy = createMemo(() => {
    const {status} = state()
    return status === 'generating' || status === 'loading'
  })
  const isModelReady = createMemo(() => {
    const currentState = state()
    return (
      currentState.status === 'complete' ||
      currentState.status === 'generating' ||
      currentState.status === 'ready' ||
      (currentState.status === 'error' && currentState.modelReady)
    )
  })
  const canPrepare = createMemo(() => state().status === 'idle' || state().status === 'error')
  const canGenerate = createMemo(() => isModelReady() && !isBusy() && request().trim().length > 0)
  const canCopy = createMemo(() => !isBusy() && output().length > 0)
  const statusMessage = createMemo(() => {
    const currentState = state()

    if (currentState.status === 'unsupported') {
      return '이 브라우저에서는 WebGPU를 사용할 수 없어요. 최신 Chrome 또는 Edge에서 열어 주세요.'
    }
    if (currentState.status === 'loading') {
      return `모델 전체 내려받는 중 · ${currentState.percentage}%`
    }
    if (currentState.status === 'generating') {
      return '현재 요청에 대한 답변을 만들고 있어요…'
    }
    if (currentState.status === 'complete') {
      return '완성했어요. 다음 요청은 이 결과를 기억하지 않아요.'
    }
    if (currentState.status === 'ready') {
      return '모델 준비가 끝났어요. 입력한 내용에 바로 답해요.'
    }
    if (currentState.status === 'error') {
      return currentState.message
    }

    return INITIAL_STATUS_MESSAGE
  })

  const handleResponse = (response: QwenWorkerResponse) => {
    if (response.type === 'loading') {
      setState({...response, status: 'loading'})
    } else if (response.type === 'ready') {
      setState({status: 'ready'})
    } else if (response.type === 'started') {
      setOutput('')
      setState({status: 'generating'})
    } else if (response.type === 'token') {
      setOutput((value) => value + response.text)
    } else if (response.type === 'complete') {
      setOutput(response.text)
      setState({status: 'complete'})
    } else {
      const modelReady = !response.restartRequired && isModelReady()

      if (response.restartRequired) {
        client?.dispose()
        client = null
      }

      setState({message: response.message, modelReady, status: 'error'})
    }
  }

  const getClient = () => {
    if (client !== null) {
      return client
    }

    client = runtime.createClient({modelId, onResponse: handleResponse})
    return client
  }

  const prepare = () => {
    if (!canPrepare() || !runtime.supportsWebGpu()) {
      return
    }

    setState({files: [], loadedBytes: 0, percentage: 0, status: 'loading', totalBytes: 0})
    getClient().prepare()
  }

  const generate = () => {
    if (!canGenerate()) {
      return
    }

    setState({status: 'generating'})
    setOutput('')
    getClient().generate(request().trim())
  }

  const copyOutput = async () => {
    if (canCopy()) {
      await navigator.clipboard.writeText(output())
    }
  }

  const release = () => {
    client?.dispose()
    client = null
    setState(runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'})
  }

  onCleanup(() => client?.dispose())

  return {
    canCopy,
    canGenerate,
    canPrepare,
    copyOutput,
    generate,
    output,
    prepare,
    release,
    request,
    setRequest,
    state,
    statusMessage,
  }
}
