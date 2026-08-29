import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

import {createDialogueClient, type CreateDialogueClientOptions, type DialogueClient} from './client'
import type {DialogueWorkerResponse} from './messages'
import {supportsWebGpu} from '../text-generation/environment'
import {createLazyClient} from '../text-generation/lazy-client'
import type {TextModelId} from '../text-generation/model'
import type {TextGenerationProgress} from '../text-generation/progress'
import type {DialogueOutputLanguage} from './prompt'

const INITIAL_STATUS_MESSAGE = '모델은 처음 한 번만 내려받고 보관해요.'
const MAXIMUM_PROGRESS = 100

interface IdleState {
  readonly status: 'idle'
}

interface LoadingState extends TextGenerationProgress {
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

export type DialogueWriterState =
  | ErrorState
  | IdleState
  | LoadingState
  | ReadyState
  | UnsupportedState

export interface UseDialogueWriterProps {
  readonly initialRequest?: string
  readonly modelId: TextModelId
  readonly onComplete?: (output: string) => void
  readonly outputLanguage?: Accessor<DialogueOutputLanguage>
  readonly runtime?: DialogueWriterRuntime
}

export interface DialogueWriterRuntime {
  readonly createClient: (options: CreateDialogueClientOptions) => DialogueClient
  readonly supportsWebGpu: () => boolean
}

export interface DialogueWriterController {
  readonly canCopy: Accessor<boolean>
  readonly canGenerate: Accessor<boolean>
  readonly canPrepare: Accessor<boolean>
  readonly copyOutput: () => Promise<void>
  readonly generate: () => void
  readonly generateWithPreparation: () => void
  readonly isBusy: Accessor<boolean>
  readonly isModelReady: Accessor<boolean>
  readonly output: Accessor<string>
  readonly prepare: () => void
  readonly progress: Accessor<number>
  readonly release: () => void
  readonly request: Accessor<string>
  readonly setRequest: (request: string) => void
  readonly state: Accessor<DialogueWriterState>
  readonly statusMessage: Accessor<string>
}

const DEFAULT_RUNTIME: DialogueWriterRuntime = {createClient: createDialogueClient, supportsWebGpu}

const isDialogueBusy = (state: DialogueWriterState) => {
  switch (state.status) {
    case 'generating':
    case 'loading':
      return true
    case 'complete':
    case 'error':
    case 'idle':
    case 'ready':
    case 'unsupported':
      return false
  }
}

const isDialogueModelReady = (state: DialogueWriterState) => {
  switch (state.status) {
    case 'complete':
    case 'generating':
    case 'ready':
      return true
    case 'error':
      return state.modelReady
    case 'idle':
    case 'loading':
    case 'unsupported':
      return false
  }
}

export const useDialogueWriter = (props: UseDialogueWriterProps): DialogueWriterController => {
  const initialRequest = untrack(() => props.initialRequest ?? '')
  const modelId = untrack(() => props.modelId)
  const outputLanguage = untrack(() => props.outputLanguage)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [request, setRequest] = createSignal(initialRequest)
  const [output, setOutput] = createSignal('')
  const [state, setState] = createSignal<DialogueWriterState>(
    runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'},
  )
  let shouldGenerateAfterPreparation = false
  const isBusy = createMemo(() => isDialogueBusy(state()))
  const isModelReady = createMemo(() => isDialogueModelReady(state()))
  const canPrepare = createMemo(() => {
    const currentState = state()
    return currentState.status === 'idle' || currentState.status === 'error'
  })
  const canGenerate = createMemo(() => isModelReady() && !isBusy() && request().trim().length > 0)
  const canCopy = createMemo(() => !isBusy() && output().length > 0)
  const progress = createMemo(() => {
    const currentState = state()

    if (currentState.status === 'loading') {
      return currentState.percentage
    }

    return isModelReady() ? MAXIMUM_PROGRESS : 0
  })
  const statusMessage = createMemo(() => {
    const currentState = state()

    switch (currentState.status) {
      case 'complete':
        return '완성했어요. 다음 요청은 이 결과를 기억하지 않아요.'
      case 'error':
        return currentState.message
      case 'generating':
        return '현재 요청에 대한 답변을 만들고 있어요…'
      case 'idle':
        return INITIAL_STATUS_MESSAGE
      case 'loading':
        if (currentState.percentage === MAXIMUM_PROGRESS) {
          return '다운로드 완료 · 모델 시작 중…'
        }

        return `모델 전체 내려받는 중 · ${currentState.percentage}%`
      case 'ready':
        return '모델 준비가 끝났어요. 입력한 내용에 바로 답해요.'
      case 'unsupported':
        return '이 브라우저에서는 WebGPU를 사용할 수 없어요. 최신 Chrome 또는 Edge에서 열어 주세요.'
    }
  })

  const handleResponse = (response: DialogueWorkerResponse) => {
    switch (response.type) {
      case 'complete':
        setOutput(response.text)
        props.onComplete?.(response.text)
        setState({status: 'complete'})
        return
      case 'error': {
        shouldGenerateAfterPreparation = false
        const modelReady = !response.restartRequired && isModelReady()

        if (response.restartRequired) {
          clientOwner.dispose()
        }

        setState({message: response.message, modelReady, status: 'error'})
        return
      }
      case 'loading':
        setState({...response, status: 'loading'})
        return
      case 'ready':
        setState({status: 'ready'})

        if (shouldGenerateAfterPreparation) {
          shouldGenerateAfterPreparation = false
          generate()
        }

        return
      case 'started':
        setOutput('')
        setState({status: 'generating'})
        return
      case 'token':
        setOutput((value) => value + response.text)
        return
    }

    response satisfies never
  }

  const clientOwner = createLazyClient(() =>
    runtime.createClient({modelId, onResponse: handleResponse}),
  )

  const prepare = () => {
    if (!canPrepare() || !runtime.supportsWebGpu()) {
      return
    }

    setState({files: [], loadedBytes: 0, percentage: 0, status: 'loading', totalBytes: 0})
    clientOwner.get().prepare()
  }

  const generate = () => {
    if (!canGenerate()) {
      return
    }

    shouldGenerateAfterPreparation = false
    setState({status: 'generating'})
    setOutput('')
    const client = clientOwner.get()
    const trimmedRequest = request().trim()

    if (outputLanguage === undefined) {
      client.generate(trimmedRequest)
    } else {
      client.generate(trimmedRequest, outputLanguage())
    }
  }

  const generateWithPreparation = () => {
    if (isBusy() || request().trim().length === 0 || state().status === 'unsupported') {
      return
    }

    if (isModelReady()) {
      generate()
      return
    }

    shouldGenerateAfterPreparation = true
    prepare()
  }

  const copyOutput = async () => {
    if (canCopy()) {
      await navigator.clipboard.writeText(output())
    }
  }

  const release = () => {
    shouldGenerateAfterPreparation = false
    clientOwner.dispose()
    setState(runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'})
  }

  onCleanup(clientOwner.dispose)

  return {
    canCopy,
    canGenerate,
    canPrepare,
    copyOutput,
    generate,
    generateWithPreparation,
    isBusy,
    isModelReady,
    output,
    prepare,
    progress,
    release,
    request,
    setRequest,
    state,
    statusMessage,
  }
}
