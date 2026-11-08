import {readModelSnapshot} from './read-model-snapshot'
import {createLineDecoder} from './create-line-decoder'
import {commandResponseSchema, modelEventSchema} from '../protocol'
import {type RenderedImage, type RenderRequest, renderRequestSchema} from '../render-types'
import {applyModelEvent, type ModelEvent} from '../model-events'
import type {ModelView} from '@winter-love/puppet/model'

export interface ConnectModelHostOptions {
  /** Same-origin local host URL. */
  readonly signal?: AbortSignal
  readonly url: string
  /** Bearer capability received from the launcher; never written to logs. */
  readonly token: string
  /** Receives validated state changes after attachment. */
  readonly onEvent: (event: ModelEvent) => void
  /** Reports transport termination; an intentional close is silent. */
  readonly onDisconnect: (message: string) => void
  /** Draws an isolated pose using the currently attached model. */
  readonly onRender: (request: RenderRequest) => Promise<RenderedImage>
}

/** Attaches to an event-driven stream; the caller closes it when the GUI is disposed. */
export const connectModelHost = async (options: ConnectModelHostOptions) => {
  const controller = new AbortController()
  const signal =
    options.signal === undefined
      ? controller.signal
      : AbortSignal.any([options.signal, controller.signal])
  const CONNECTION_LIMIT = 30_000
  const deadline = AbortSignal.timeout(CONNECTION_LIMIT)
  const timeout = () => controller.abort(new Error('Backend did not send an initial model'))
  deadline.addEventListener('abort', timeout, {once: true})
  const clientId = crypto.randomUUID()
  const headers = {Authorization: `Bearer ${options.token}`, 'X-Poffo-Client': clientId}
  let intentional = false
  const response = await fetch(`${options.url}/api/events?initial=metadata&clientId=${clientId}`, {
    headers,
    signal,
  })
  if (!response.ok || response.body === null) {
    throw new Error(`Backend connection failed: ${response.status}`)
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let initialResolve!: (view: ModelView) => void
  let initialReject!: (error: unknown) => void
  const initial = new Promise<ModelView>((resolve, reject) => {
    initialResolve = resolve
    initialReject = reject
  })
  let view: ModelView | undefined
  let sequence = -1
  const queued: ModelEvent[] = []
  const receive = (event: ModelEvent) => {
    if (view === undefined) {
      queued.push(event)
      return
    }
    if (event.sequence <= sequence) {
      return
    }
    view = applyModelEvent(view, event)
    sequence = event.sequence
    options.onEvent(event)
  }
  const consume = async () => {
    const decode = createLineDecoder()
    try {
      while (true) {
        // A stream read is the completion signal; no polling or fixed delay is needed.
        // eslint-disable-next-line no-await-in-loop
        const chunk = await reader.read()
        if (chunk.done) {
          throw new Error('Backend disconnected')
        }
        for (const line of decode(chunk.value)) {
          const data: unknown = JSON.parse(line)
          const render = renderRequestSchema.safeParse(data)
          if (render.success) {
            const request = render.data
            options
              .onRender(request)
              .then(
                (result) => ({id: request.id, result}),
                (error: unknown) => ({
                  error: error instanceof Error ? error.message : 'Render failed',
                  id: request.id,
                }),
              )
              .then((result) =>
                fetch(`${options.url}/api/render-result`, {
                  body: JSON.stringify(result),
                  headers: {...headers, 'Content-Type': 'application/json'},
                  method: 'POST',
                  signal,
                }),
              )
              .catch(() => undefined)
          } else {
            receive(modelEventSchema.parse(data))
          }
        }
      }
    } catch (error) {
      deadline.removeEventListener('abort', timeout)
      initialReject(error)
      controller.abort(error)
      if (!intentional) {
        options.onDisconnect(error instanceof Error ? error.message : 'Backend disconnected')
      }
    } finally {
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  }
  consume()
  const initialize = async () => {
    const event = await readModelSnapshot({headers, signal, url: options.url})
    const snapshot = applyModelEvent(undefined, event)
    view = snapshot
    sequence = event.sequence
    options.onEvent(event)
    for (const pending of queued.splice(0)) {
      receive(pending)
    }
    deadline.removeEventListener('abort', timeout)
    initialResolve(snapshot)
  }
  initialize().catch((error: unknown) => {
    controller.abort(error)
    initialReject(error)
  })
  return {
    close: () => {
      intentional = true
      controller.abort()
    },
    initial: await initial,
    send: async (operation: string, input: unknown) => {
      const result = await fetch(`${options.url}/api/command`, {
        body: JSON.stringify({input, operation, requestId: crypto.randomUUID()}),
        headers: {...headers, 'Content-Type': 'application/json'},
        method: 'POST',
        signal,
      })
      if (!result.ok) {
        throw new Error(`Backend request failed: ${result.status}`)
      }
      return commandResponseSchema.parse(await result.json())
    },
  }
}
