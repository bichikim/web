import {z} from 'zod'
import {callViewerTool} from './call-viewer-tool'
import type {ViewerPort} from './types'

interface McpStreamOptions<Value extends object> {
  readonly call: ViewerPort['call']
  readonly url: string
  readonly schema: z.ZodType<Value>
  readonly signal: AbortSignal
  readonly receive: (value: Value) => void | Promise<void>
}

/** Reads one batch at a time through MCP, closing the cursor on completion or cancellation. */
export const readMcpStream = async <Value extends object>(
  options: McpStreamOptions<Value>,
): Promise<void> => {
  const schema = z.discriminatedUnion('done', [
    z.object({done: z.literal(true)}),
    z.object({batch: options.schema, done: z.literal(false)}),
  ])
  let closing: Promise<unknown> | undefined
  const close = (): Promise<unknown> => {
    closing ??= options.call('code.stream.close', {url: options.url}).catch(() => undefined)
    return closing
  }
  const abort = (): void => {
    close()
  }
  options.signal.addEventListener('abort', abort, {once: true})
  try {
    while (true) {
      options.signal.throwIfAborted()
      // oxlint-disable-next-line no-await-in-loop -- Demand the next batch only after the previous batch is consumed.
      const result = await callViewerTool({
        input: {url: options.url},
        name: 'code.stream.read',
        port: {call: options.call},
        schema,
      })
      options.signal.throwIfAborted()
      if (result.done) {
        return
      }
      // oxlint-disable-next-line no-await-in-loop -- Preserve rendering backpressure between batches.
      await options.receive(result.batch)
    }
  } finally {
    options.signal.removeEventListener('abort', abort)
    await close()
  }
}
