import {clampDisplayedPercentage} from 'src/utils/clamp-displayed-percentage'
import {copyTextToClipboard} from 'src/utils/copy-text-to-clipboard'
import * as m from '@paraglide/message'
import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {localizeErrorMessage} from 'src/features/localization/localized-messages'

import {createDialogueClient, type CreateDialogueClientOptions, type DialogueClient} from './client'
import type {DialogueWorkerResponse} from './messages'
import {supportsWebGpu} from '../text-generation/environment'
import {supportsTextModel} from '../text-generation/supports-text-model'
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
  readonly modelId: Accessor<TextModelId>
  readonly selectModel: (modelId: TextModelId) => void
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

interface DialogueClientSessionOptions {
  readonly createClient: DialogueWriterRuntime['createClient']
  readonly modelId: TextModelId
  readonly isBusy: Accessor<boolean>
  readonly onModelChange: () => void
  readonly onResponse: (response: DialogueWorkerResponse) => void
}

const createDialogueClientSession = (options: DialogueClientSessionOptions) => {
  const [modelId, setModelId] = createSignal(options.modelId)
  let nextClientId = 0
  let activeClientId: number | null = null
  const clientOwner = createLazyClient(() => {
    nextClientId += 1
    const clientId = nextClientId
    activeClientId = clientId

    return options.createClient({
      modelId: modelId(),
      onResponse: (response) => {
        if (clientId !== activeClientId) {
          return
        }

        options.onResponse(response)
      },
    })
  })

  const dispose = () => {
    activeClientId = null
    clientOwner.dispose()
  }
  const selectModel = (nextModelId: TextModelId) => {
    if (nextModelId === modelId() || options.isBusy()) {
      return
    }
    dispose()
    setModelId(nextModelId)
    options.onModelChange()
  }
  onCleanup(dispose)
  return {dispose, get: clientOwner.get, modelId, selectModel}
}

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

const getDialogueWriterProgress = (currentState: DialogueWriterState, modelReady: boolean) => {
  if (currentState.status === 'loading') {
    return currentState.percentage
  }

  return modelReady ? MAXIMUM_PROGRESS : 0
}

const getDialogueWriterStatusMessage = (currentState: DialogueWriterState): string => {
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

      return m.dialogue_writer_downloading_status({
        percentage: clampDisplayedPercentage(currentState.percentage) ?? 0,
      })
    case 'ready':
      return m.dialogue_writer_ready_status()
    case 'unsupported':
      return m.dialogue_writer_unsupported_status()
  }

  currentState satisfies never
}

// oxlint-disable-next-line eslint/max-lines-per-function -- One owner coordinates the selected model, Worker session and output.
export const useDialogueWriter = (props: UseDialogueWriterProps): DialogueWriterController => {
  const outputLanguage = untrack(() => props.outputLanguage)
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const isSupported = (modelId: TextModelId) =>
    supportsTextModel({modelId, webGpu: runtime.supportsWebGpu()})
  const [request, setRequest] = createSignal(untrack(() => props.initialRequest ?? ''))
  const [output, setOutput] = createSignal('')
  const [hasCompleteOutput, setHasCompleteOutput] = createSignal(false)
  const [state, setState] = createSignal<DialogueWriterState>(
    isSupported(untrack(() => props.modelId)) ? {status: 'idle'} : {status: 'unsupported'},
  )
  let shouldGenerateAfterPreparation = false
  let generationInFlight = false
  const isBusy = createMemo(() => isDialogueBusy(state()))
  const isModelReady = createMemo(() => isDialogueModelReady(state()))
  const canPrepare = createMemo(() => isDialoguePreparationAllowed(state()))
  const canGenerate = createMemo(() => isModelReady() && !isBusy() && isNonBlankString(request()))
  const canCopy = createMemo(() => hasCompleteOutput() && !isBusy() && output().length > 0)
  const progress = createMemo(() => getDialogueWriterProgress(state(), isModelReady()))

  const handleResponse = (response: DialogueWorkerResponse) => {
    switch (response.type) {
      case 'complete':
        generationInFlight = false
        setOutput(response.text)
        setHasCompleteOutput(true)
        props.onComplete?.(response.text)
        setState({status: 'complete'})
        return
      case 'error': {
        generationInFlight = false
        shouldGenerateAfterPreparation = false
        const modelReady = !response.restartRequired && isModelReady()

        if (response.restartRequired) {
          clientSession.dispose()
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
        setHasCompleteOutput(false)
        setOutput('')
        setState({status: 'generating'})
        return
      case 'token':
        setOutput((value) => value + response.text)
        return
    }

    response satisfies never
  }

  const clientSession = createDialogueClientSession({
    createClient: runtime.createClient,
    isBusy,
    modelId: untrack(() => props.modelId),
    onModelChange: () => release(),
    onResponse: handleResponse,
  })

  const updateRequest = (nextRequest: string) => {
    if (request() === nextRequest) {
      return
    }

    setRequest(nextRequest)
    setOutput('')
    setHasCompleteOutput(false)

    if (generationInFlight) {
      clientSession.dispose()
      setState({status: 'idle'})
      return
    }

    if (state().status === 'complete') {
      setState({status: 'ready'})
    }
  }

  const prepare = () => {
    if (!canPrepare() || !isSupported(clientSession.modelId())) {
      return
    }

    setState({files: [], loadedBytes: 0, percentage: 0, status: 'loading', totalBytes: 0})
    clientSession.get().prepare()
  }

  const generate = () => {
    if (!canGenerate()) {
      return
    }

    shouldGenerateAfterPreparation = false
    generationInFlight = true
    setState({status: 'generating'})
    setOutput('')
    setHasCompleteOutput(false)
    const client = clientSession.get()
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
      await copyTextToClipboard(output())
    }
  }

  const release = () => {
    shouldGenerateAfterPreparation = false
    generationInFlight = false
    clientSession.dispose()
    setState(isSupported(clientSession.modelId()) ? {status: 'idle'} : {status: 'unsupported'})
  }

  return {
    canCopy,
    canGenerate,
    canPrepare,
    copyOutput,
    generate,
    generateWithPreparation,
    isBusy,
    isModelReady,
    modelId: clientSession.modelId,
    output,
    prepare,
    progress,
    release,
    request,
    selectModel: clientSession.selectModel,
    setRequest: updateRequest,
    state,
    statusMessage: createMemo(() => getDialogueWriterStatusMessage(state())),
  }
}
