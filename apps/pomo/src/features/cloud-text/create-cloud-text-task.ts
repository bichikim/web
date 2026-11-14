import type {TextGenerationMessage} from '../text-generation/runtime'
import {getExceptionMessage} from '../error-detail'
import {requestCloudText} from './client'
import type {CloudTextResponse} from './contracts'

interface CloudTextTaskOptions {
  /** Maximum output length for this request. */
  readonly maximumTokens: number
  /** Conversation supplied to the selected cloud model. */
  readonly messages: ReadonlyArray<TextGenerationMessage>
  /** Receives the completed result while the task remains active. */
  readonly onComplete: (response: CloudTextResponse) => void
  /** Receives a failure while the task remains active. */
  readonly onError: (message: string) => void
  /** Runs when a request starts. */
  readonly onStarted: () => void
  /** Sampling temperature; omission preserves the provider default. */
  readonly temperature?: number
}

/** Owns one cancellable cloud generation and suppresses responses after disposal. */
export const createCloudTextTask = () => {
  let active: AbortController | null = null
  let disposed = false
  const generate = async (options: CloudTextTaskOptions): Promise<void> => {
    if (active !== null || disposed) {
      return
    }
    const controller = new AbortController()
    active = controller
    options.onStarted()
    try {
      const {temperature} = options
      const text = await requestCloudText(
        {
          maximumTokens: options.maximumTokens,
          messages: [...options.messages],
          requestId: crypto.randomUUID(),
          ...(temperature === undefined ? {} : {temperature}),
        },
        controller.signal,
      )
      if (!disposed && !controller.signal.aborted) {
        options.onComplete(text)
      }
    } catch (error: unknown) {
      if (!disposed && !controller.signal.aborted) {
        options.onError(getExceptionMessage(error, '클라우드 텍스트 생성에 실패했어요.'))
      }
    } finally {
      active = null
    }
  }
  return {
    dispose: () => {
      disposed = true
      active?.abort()
    },
    generate,
  }
}
