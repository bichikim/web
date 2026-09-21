import * as m from '@paraglide/message'
import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {localizeErrorMessage} from 'src/features/localization/localized-messages'

import {createDialogueClient, type CreateDialogueClientOptions, type DialogueClient} from './client'
import type {DialogueWorkerResponse} from './messages'
import {supportsWebGpu} from '../text-generation/environment'
import {createLazyClient} from '../text-generation/lazy-client'
import type {TextModelId} from '../text-generation/model'
import type {TextGenerationProgress} from '../text-generation/progress'
import type {DialogueOutputLanguage} from './prompt'

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

const isDialoguePreparationAllowed = (state: DialogueWriterState) =>
  state.status === 'idle' || state.status === 'error'

export const useDialogueWriter = (props: UseDialogueWriterProps): DialogueWriterController => {
  const modelId = untrack(() => props.modelId)
  const outputLanguage = untrack(() => props.outputLanguage)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [request, setRequest] = createSignal(untrack(() => props.initialRequest ?? ''))
  const [output, setOutput] = createSignal('')
  const [state, setState] = createSignal<DialogueWriterState>(
    runtime.supportsWebGpu() ? {status: 'idle'} : {status: 'unsupported'},
  )
  let shouldGenerateAfterPreparation = false
  const isBusy = createMemo(() => isDialogueBusy(state()))
  const isModelReady = createMemo(() => isDialogueModelReady(state()))
  const canPrepare = createMemo(() => isDialoguePreparationAllowed(state()))
  const canGenerate = createMemo(() => isModelReady() && !isBusy() && isNonBlankString(request()))
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
        return m.dialogue_writer_complete_status()
      case 'error':
        return localizeErrorMessage(currentState.message, m.dialogue_writer_error())
      case 'generating':
        return m.dialogue_writer_generating_status()
      case 'idle':
        return m.dialogue_writer_initial_status()
      case 'loading':
        if (currentState.percentage === MAXIMUM_PROGRESS) {
          return m.dialogue_writer_download_complete_status()
        }

        return m.dialogue_writer_downloading_status({percentage: currentState.percentage})
      case 'ready':
        return m.dialogue_writer_ready_status()
      case 'unsupported':
        return m.dialogue_writer_unsupported_status()
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
        if (state().status === 'generating') {
          return
        }

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
    if (isBusy() || !isNonBlankString(request()) || state().status === 'unsupported') {
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
