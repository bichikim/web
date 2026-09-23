import {failureResult, type Result, successResult} from 'src/features/result'
import {getErrorMessage} from 'src/utils/get-error-message'

import type {TextGenerationProgress} from './progress'
import type {TextGenerationMessage, TextGenerationRuntime, TextTokenVocabulary} from './runtime'
import type {TextModelId} from './model'

export interface DeviceTextGenerationTarget {
  readonly kind: 'device'
  readonly modelId: TextModelId
}

export interface ServerTextGenerationTarget {
  readonly kind: 'server'
  readonly modelId: 'gpt-5.6-luna'
  readonly provider: 'openai'
}

export type TextGenerationExecutionTarget = DeviceTextGenerationTarget | ServerTextGenerationTarget

export type TextGenerationPhase = 'count-tokens' | 'generate' | 'prepare'

interface TextGenerationErrorBase {
  readonly detail?: string
  readonly phase: TextGenerationPhase
  readonly retryable: boolean
}

export interface TextGenerationCancelledError extends TextGenerationErrorBase {
  readonly code: 'cancelled'
  readonly retryable: false
}

export interface TextGenerationBusyError extends TextGenerationErrorBase {
  readonly code: 'busy'
  readonly detail: string
  readonly phase: 'generate'
  readonly retryable: true
}

export interface TextGenerationExecutionError extends TextGenerationErrorBase {
  readonly code: 'execution-failed'
  readonly retryable: true
}

export interface TextGenerationInvalidRequestError extends TextGenerationErrorBase {
  readonly code: 'invalid-request'
  readonly phase: 'generate'
  readonly retryable: false
}

export interface TextGenerationServerUnavailableError extends TextGenerationErrorBase {
  readonly code: 'server-unavailable'
  readonly detail: string
  readonly retryable: false
}

export type TextGenerationError =
  | TextGenerationBusyError
  | TextGenerationCancelledError
  | TextGenerationExecutionError
  | TextGenerationInvalidRequestError
  | TextGenerationServerUnavailableError

export interface TextGenerationParameters {
  readonly maximumTokens: number
  readonly noRepeatNgramSize: number
  readonly repetitionPenalty: number
  readonly suppressedTokenIds?: ReadonlyArray<number>
  readonly temperature: number
  readonly topK: number
  readonly topP: number
}

export interface TextGenerationRequest {
  readonly execution: TextGenerationExecutionTarget
  readonly messages: ReadonlyArray<TextGenerationMessage>
  readonly parameters: TextGenerationParameters
  readonly requestId: string
}

export interface TextGenerationExecutionStartedResponse {
  readonly requestId: string
  readonly type: 'started'
}

export interface TextGenerationExecutionTokenResponse {
  readonly requestId: string
  readonly text: string
  readonly type: 'token'
}

export interface TextGenerationExecutionCompleteResponse {
  readonly requestId: string
  readonly text: string
  readonly type: 'complete'
}

export interface TextGenerationExecutionCancelledResponse {
  readonly requestId: string
  readonly type: 'cancelled'
}

export interface TextGenerationExecutionErrorResponse {
  readonly error: TextGenerationError
  readonly requestId: string
  readonly type: 'error'
}

export type TextGenerationResponse =
  | TextGenerationExecutionCancelledResponse
  | TextGenerationExecutionCompleteResponse
  | TextGenerationExecutionErrorResponse
  | TextGenerationExecutionStartedResponse
  | TextGenerationExecutionTokenResponse

export interface TextGenerationResponseObserver {
  readonly onResponse: (response: TextGenerationResponse) => void
}

export interface TextGenerationExecutionProvider {
  readonly cancel: (requestId: string) => void
  readonly countTokens: (
    target: TextGenerationExecutionTarget,
    messages: ReadonlyArray<TextGenerationMessage>,
  ) => Promise<number>
  readonly dispose: () => void
  readonly generate: (
    request: TextGenerationRequest,
    onToken: (text: string) => void,
  ) => Promise<string>
  readonly getTokenizer: (target: TextGenerationExecutionTarget) => TextTokenVocabulary
  readonly prepare: (target: TextGenerationExecutionTarget) => Promise<void>
}

export interface CreateServerTextGenerationProviderOptions {
  readonly onProgress: (progress: TextGenerationProgress) => void
  readonly target: ServerTextGenerationTarget
}

export interface CreateTextGenerationExecutorOptions {
  readonly createServerProvider?: (
    options: CreateServerTextGenerationProviderOptions,
  ) => TextGenerationExecutionProvider
  readonly onProgress?: (progress: TextGenerationProgress) => void
}

export interface TextGenerationExecutor {
  readonly cancel: (requestId: string) => void
  readonly countTokens: (
    target: TextGenerationExecutionTarget,
    messages: ReadonlyArray<TextGenerationMessage>,
  ) => Promise<Result<number, TextGenerationError>>
  readonly dispose: () => void
  readonly generate: (
    request: TextGenerationRequest,
    observer: TextGenerationResponseObserver,
  ) => Promise<Result<string, TextGenerationError>>
  readonly getTokenizer: (
    target: TextGenerationExecutionTarget,
  ) => Result<TextTokenVocabulary, TextGenerationError>
  readonly prepare: (
    target: TextGenerationExecutionTarget,
  ) => Promise<Result<void, TextGenerationError>>
}

interface ActiveTextGenerationOperation {
  readonly cancel: () => void
  readonly provider: TextGenerationExecutionProvider
}

interface TextGenerationProviderOptions {
  readonly createServerProvider?: (
    options: CreateServerTextGenerationProviderOptions,
  ) => TextGenerationExecutionProvider
  readonly deviceProvider: TextGenerationExecutionProvider
  readonly onProgress: (progress: TextGenerationProgress) => void
  readonly serverProviders: Map<string, TextGenerationExecutionProvider>
}

type TextGenerationProviderResolver = (
  target: TextGenerationExecutionTarget,
  phase: TextGenerationPhase,
) => Result<TextGenerationExecutionProvider, TextGenerationError>

const SERVER_UNAVAILABLE_MESSAGE = '서버 텍스트 실행기가 아직 연결되지 않았어요.'

const createCancelledError = (phase: TextGenerationPhase): TextGenerationCancelledError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})

const createServerUnavailableError = (
  phase: TextGenerationPhase,
): TextGenerationServerUnavailableError => ({
  code: 'server-unavailable',
  detail: SERVER_UNAVAILABLE_MESSAGE,
  phase,
  retryable: false,
})

const createExecutionError = (
  phase: TextGenerationPhase,
  cause: unknown,
): TextGenerationExecutionError => {
  const detail = getErrorMessage(cause, '')

  return detail.length === 0
    ? {code: 'execution-failed', phase, retryable: true}
    : {code: 'execution-failed', detail, phase, retryable: true}
}

const createInvalidRequestError = (): TextGenerationInvalidRequestError => ({
  code: 'invalid-request',
  detail: '텍스트 생성 요청 ID가 비어 있어요.',
  phase: 'generate',
  retryable: false,
})

const getDeviceTarget = (target: TextGenerationExecutionTarget): DeviceTextGenerationTarget => {
  switch (target.kind) {
    case 'device':
      return target
    case 'server':
      throw new Error('서버 실행 대상은 기기 텍스트 Provider에서 처리할 수 없어요.')
  }

  target satisfies never
}

const createDeviceTextGenerationProvider = (options: {
  readonly onProgress: (progress: TextGenerationProgress) => void
}): TextGenerationExecutionProvider => {
  let textRuntimePromise: Promise<TextGenerationRuntime> | null = null
  let textRuntime: TextGenerationRuntime | null = null
  const generationControllers = new Map<string, AbortController>()

  const getTextRuntime = () => {
    textRuntimePromise ??= import('./transformers-runtime').then(
      async ({createTransformersRuntime}) => {
        const runtime = await createTransformersRuntime({onProgress: options.onProgress})
        textRuntime = runtime
        return runtime
      },
    )
    return textRuntimePromise
  }

  return {
    cancel: (requestId) => generationControllers.get(requestId)?.abort(),
    countTokens: async (target, messages) => {
      getDeviceTarget(target)
      const runtime = await getTextRuntime()
      return runtime.countTokens([...messages].map((message) => ({...message})))
    },
    dispose: () => {
      for (const controller of generationControllers.values()) {
        controller.abort()
      }
      generationControllers.clear()
    },
    generate: async (request, onToken) => {
      getDeviceTarget(request.execution)
      const controller = new AbortController()
      generationControllers.set(request.requestId, controller)

      try {
        const runtime = await getTextRuntime()
        const {parameters} = request

        return await runtime.generate({
          maximumTokens: parameters.maximumTokens,
          messages: [...request.messages].map((message) => ({...message})),
          noRepeatNgramSize: parameters.noRepeatNgramSize,
          onToken,
          repetitionPenalty: parameters.repetitionPenalty,
          signal: controller.signal,
          suppressedTokenIds:
            parameters.suppressedTokenIds === undefined
              ? undefined
              : [...parameters.suppressedTokenIds],
          temperature: parameters.temperature,
          topK: parameters.topK,
          topP: parameters.topP,
        })
      } finally {
        if (generationControllers.get(request.requestId) === controller) {
          generationControllers.delete(request.requestId)
        }
      }
    },
    getTokenizer: (target) => {
      getDeviceTarget(target)
      if (textRuntime === null) {
        throw new Error('텍스트 모델 런타임이 준비되지 않았어요.')
      }

      return textRuntime.getTokenizer()
    },
    prepare: async (target) => {
      const deviceTarget = getDeviceTarget(target)
      const runtime = await getTextRuntime()
      await runtime.prepare(deviceTarget.modelId)
    },
  }
}

const getServerProviderKey = (target: ServerTextGenerationTarget) =>
  `${target.provider}:${target.modelId}`

const getTextGenerationProvider = (
  target: TextGenerationExecutionTarget,
  options: TextGenerationProviderOptions,
): TextGenerationExecutionProvider | null => {
  switch (target.kind) {
    case 'device':
      return options.deviceProvider
    case 'server': {
      if (options.createServerProvider === undefined) {
        return null
      }

      const key = getServerProviderKey(target)
      const current = options.serverProviders.get(key)
      if (current !== undefined) {
        return current
      }

      const provider = options.createServerProvider({onProgress: options.onProgress, target})
      options.serverProviders.set(key, provider)
      return provider
    }
  }

  target satisfies never
}

const resolveTextGenerationProvider = (
  target: TextGenerationExecutionTarget,
  phase: TextGenerationPhase,
  options: TextGenerationProviderOptions,
): Result<TextGenerationExecutionProvider, TextGenerationError> => {
  try {
    const provider = getTextGenerationProvider(target, options)
    return provider === null
      ? failureResult(createServerUnavailableError(phase))
      : successResult(provider)
  } catch (error: unknown) {
    return failureResult(createExecutionError(phase, error))
  }
}

const prepareTextGenerationTarget = async (
  target: TextGenerationExecutionTarget,
  disposed: boolean,
  resolveProvider: TextGenerationProviderResolver,
): Promise<Result<void, TextGenerationError>> => {
  if (disposed) {
    return failureResult(createCancelledError('prepare'))
  }

  const providerResult = resolveProvider(target, 'prepare')
  if (!providerResult.ok) {
    return providerResult
  }

  try {
    await providerResult.value.prepare(target)
    return successResult(undefined)
  } catch (error: unknown) {
    return failureResult(createExecutionError('prepare', error))
  }
}

const countTextGenerationTokens = async (
  target: TextGenerationExecutionTarget,
  messages: ReadonlyArray<TextGenerationMessage>,
  disposed: boolean,
  resolveProvider: TextGenerationProviderResolver,
): Promise<Result<number, TextGenerationError>> => {
  if (disposed) {
    return failureResult(createCancelledError('count-tokens'))
  }

  const providerResult = resolveProvider(target, 'count-tokens')
  if (!providerResult.ok) {
    return providerResult
  }

  try {
    return successResult(await providerResult.value.countTokens(target, messages))
  } catch (error: unknown) {
    return failureResult(createExecutionError('count-tokens', error))
  }
}

const getTextGenerationTokenizer = (
  target: TextGenerationExecutionTarget,
  disposed: boolean,
  resolveProvider: TextGenerationProviderResolver,
): Result<TextTokenVocabulary, TextGenerationError> => {
  if (disposed) {
    return failureResult(createCancelledError('count-tokens'))
  }

  const providerResult = resolveProvider(target, 'count-tokens')
  if (!providerResult.ok) {
    return providerResult
  }

  try {
    return successResult(providerResult.value.getTokenizer(target))
  } catch (error: unknown) {
    return failureResult(createExecutionError('count-tokens', error))
  }
}

const createTextGenerationOperation = (
  request: TextGenerationRequest,
  observer: TextGenerationResponseObserver,
  provider: TextGenerationExecutionProvider,
  activeOperations: Map<string, ActiveTextGenerationOperation>,
): Promise<Result<string, TextGenerationError>> =>
  new Promise((resolve) => {
    let settled = false
    const removeActiveOperation = () => activeOperations.delete(request.requestId)
    const cancel = () => {
      if (settled) {
        return
      }

      settled = true
      removeActiveOperation()
      provider.cancel(request.requestId)
      observer.onResponse({requestId: request.requestId, type: 'cancelled'})
      resolve(failureResult(createCancelledError('generate')))
    }
    activeOperations.set(request.requestId, {cancel, provider})
    observer.onResponse({requestId: request.requestId, type: 'started'})

    const generation = Promise.resolve()
      .then(() => {
        if (settled) {
          return null
        }

        return provider.generate(request, (text) => {
          if (!settled) {
            observer.onResponse({requestId: request.requestId, text, type: 'token'})
          }
        })
      })
      .then(
        (text) => {
          if (settled || text === null) {
            return
          }

          settled = true
          removeActiveOperation()
          observer.onResponse({requestId: request.requestId, text, type: 'complete'})
          resolve(successResult(text))
        },
        (error: unknown) => {
          if (settled) {
            return
          }

          settled = true
          removeActiveOperation()
          const failure = createExecutionError('generate', error)
          observer.onResponse({error: failure, requestId: request.requestId, type: 'error'})
          resolve(failureResult(failure))
        },
      )
    generation.catch(() => undefined)
  })

interface GenerateTextExecutionOptions {
  readonly activeOperations: Map<string, ActiveTextGenerationOperation>
  readonly disposed: boolean
  readonly observer: TextGenerationResponseObserver
  readonly request: TextGenerationRequest
  readonly resolveProvider: TextGenerationProviderResolver
}

const generateText = (
  options: GenerateTextExecutionOptions,
): Promise<Result<string, TextGenerationError>> => {
  const {activeOperations, disposed, observer, request, resolveProvider} = options

  if (request.requestId.trim().length === 0) {
    const error = createInvalidRequestError()
    observer.onResponse({error, requestId: request.requestId, type: 'error'})
    return Promise.resolve(failureResult(error))
  }

  if (disposed) {
    const error = createCancelledError('generate')
    observer.onResponse({requestId: request.requestId, type: 'cancelled'})
    return Promise.resolve(failureResult(error))
  }

  if (activeOperations.has(request.requestId)) {
    const error: TextGenerationBusyError = {
      code: 'busy',
      detail: '같은 텍스트 생성 요청이 이미 실행 중이에요.',
      phase: 'generate',
      retryable: true,
    }
    observer.onResponse({error, requestId: request.requestId, type: 'error'})
    return Promise.resolve(failureResult(error))
  }

  const providerResult = resolveProvider(request.execution, 'generate')
  if (!providerResult.ok) {
    observer.onResponse({error: providerResult.error, requestId: request.requestId, type: 'error'})
    return Promise.resolve(providerResult)
  }

  return createTextGenerationOperation(request, observer, providerResult.value, activeOperations)
}

/** Creates the shared text execution boundary and routes device or server targets. */
export const createTextGenerationExecutor = (
  options: CreateTextGenerationExecutorOptions = {},
): TextGenerationExecutor => {
  const onProgress = options.onProgress ?? (() => undefined)
  const deviceProvider = createDeviceTextGenerationProvider({onProgress})
  const serverProviders = new Map<string, TextGenerationExecutionProvider>()
  const activeOperations = new Map<string, ActiveTextGenerationOperation>()
  let disposed = false
  const providerOptions: TextGenerationProviderOptions = {
    createServerProvider: options.createServerProvider,
    deviceProvider,
    onProgress,
    serverProviders,
  }
  const resolveProvider: TextGenerationProviderResolver = (target, phase) =>
    resolveTextGenerationProvider(target, phase, providerOptions)
  const cancel = (requestId: string) => activeOperations.get(requestId)?.cancel()
  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    for (const operation of activeOperations.values()) {
      operation.cancel()
    }
    deviceProvider.dispose()
    for (const provider of serverProviders.values()) {
      provider.dispose()
    }
    serverProviders.clear()
  }

  return {
    cancel,
    countTokens: (target, messages) =>
      countTextGenerationTokens(target, messages, disposed, resolveProvider),
    dispose,
    generate: (request, observer) =>
      generateText({activeOperations, disposed, observer, request, resolveProvider}),
    getTokenizer: (target) => getTextGenerationTokenizer(target, disposed, resolveProvider),
    prepare: (target) => prepareTextGenerationTarget(target, disposed, resolveProvider),
  }
}
