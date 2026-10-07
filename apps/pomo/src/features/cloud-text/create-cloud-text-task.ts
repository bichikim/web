import type {TextGenerationMessage} from '../text-generation/runtime'
import {requestCloudText} from './client'
import type {CloudTextResponse} from './contracts'

interface CloudTextTaskOptions {
  readonly maximumTokens: number
  readonly messages: ReadonlyArray<TextGenerationMessage>
  readonly onComplete: (response: CloudTextResponse) => void
  readonly onError: (message: string) => void
  readonly onStarted: () => void
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
      const text = await requestCloudText(
        {
          maximumTokens: options.maximumTokens,
          messages: [...options.messages],
          requestId: crypto.randomUUID(),
        },
        controller.signal,
      )
      if (!disposed && !controller.signal.aborted) {
        options.onComplete(text)
      }
    } catch (error: unknown) {
      if (!disposed && !controller.signal.aborted) {
        options.onError(
          error instanceof Error ? error.message : '클라우드 텍스트 생성에 실패했어요.',
        )
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
