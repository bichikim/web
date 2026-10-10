import {z} from 'zod'

interface JsonStreamOptions<Value extends object> {
  readonly url: string
  readonly signal: AbortSignal
  readonly schema: z.ZodType<Value>
  readonly receive: (value: Value) => void | Promise<void>
}

/** Consumes validated NDJSON batches until a terminal message, releasing the reader on cancellation. */
export const readJsonStream = async <Value extends object>(
  options: JsonStreamOptions<Value>,
): Promise<void> => {
  const messageSchema = z.union([
    options.schema,
    z.object({done: z.literal(true)}),
    z.object({error: z.string()}),
  ])
  options.signal.throwIfAborted()
  const response = await fetch(options.url, {signal: options.signal})
  options.signal.throwIfAborted()
  if (!response.ok || response.body === null) {
    throw new Error('스트림에 연결할 수 없습니다.')
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const abort = (): void => {
    reader.cancel(options.signal.reason).catch(() => undefined)
  }
  options.signal.addEventListener('abort', abort, {once: true})
  let pending = ''
  let complete = false
  try {
    while (!complete) {
      options.signal.throwIfAborted()
      // oxlint-disable-next-line no-await-in-loop -- A stream must consume its next chunk after processing the previous one.
      const chunk = await reader.read()
      options.signal.throwIfAborted()
      if (chunk.done) {
        break
      }
      pending += chunk.value
      let separator = pending.indexOf('\n')
      while (separator >= 0) {
        const line = pending.slice(0, separator)
        pending = pending.slice(separator + 1)
        const message = messageSchema.parse(JSON.parse(line))
        options.signal.throwIfAborted()
        if ('error' in message) {
          throw new Error('일부 결과를 읽지 못했습니다. 다시 조회해 주세요.')
        }
        if ('done' in message) {
          complete = true
          break
        }
        // oxlint-disable-next-line no-await-in-loop -- Await consumption before reading the next message.
        await options.receive(message)
        separator = pending.indexOf('\n')
      }
    }
    if (!complete) {
      throw new Error('조회 연결이 끊겼습니다. 다시 조회해 주세요.')
    }
  } finally {
    options.signal.removeEventListener('abort', abort)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
