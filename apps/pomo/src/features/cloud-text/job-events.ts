// oxlint-disable no-await-in-loop -- Consume notification frames and reconnect in order.
import {cloudTextJobEventSchema, type CloudTextResponse} from './contracts'

interface CloudTextConnectionComplete {
  readonly kind: 'complete'
  readonly response: CloudTextResponse
}
interface CloudTextConnectionDisconnected {
  readonly kind: 'disconnected'
  readonly cause: unknown
}
interface CloudTextConnectionFailed {
  readonly kind: 'failed' | 'cancelled'
}
export type CloudTextConnectionResult =
  | CloudTextConnectionComplete
  | CloudTextConnectionDisconnected
  | CloudTextConnectionFailed

/** Reads newline-delimited state notifications until the generation reaches a terminal state. */
export const readCloudTextEvents = async (
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<CloudTextConnectionResult> => {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let remainder = ''
  try {
    while (!signal.aborted) {
      const chunk = await reader.read().then(
        (frame) => ({frame, kind: 'frame' as const}),
        (cause: unknown) => {
          signal.throwIfAborted()
          return {cause, kind: 'disconnected' as const}
        },
      )
      if (chunk.kind === 'disconnected') {
        return chunk
      }
      const {frame} = chunk
      const lines = `${remainder}${decoder.decode(frame.value, {stream: !frame.done})}`.split('\n')
      remainder = frame.done ? '' : (lines.pop() ?? '')
      for (const line of lines.filter((value) => value.trim().length > 0)) {
        const event = cloudTextJobEventSchema.parse(JSON.parse(line))
        if (event.kind === 'complete') {
          return {
            kind: 'complete',
            response: {
              modelId: event.modelId,
              text: event.text,
              tokenCount: event.tokenCount,
              usage: event.usage,
            },
          }
        }
        if (event.kind !== 'pending') {
          return {kind: event.kind}
        }
      }
      if (frame.done) {
        return {cause: null, kind: 'disconnected'}
      }
    }
    signal.throwIfAborted()
    return {cause: null, kind: 'disconnected'}
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
