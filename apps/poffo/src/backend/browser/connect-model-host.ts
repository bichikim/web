import {readModelSnapshot} from './read-model-snapshot'
import {createLineDecoder} from './create-line-decoder'
import {commandResponseSchema, modelEventSchema} from '../protocol'
import {type RenderedImage, type RenderRequest, renderRequestSchema} from '../render-types'
import {applyModelEvent, type ModelEvent} from '../model-events'
import type {ModelView} from '@winter-love/puppet/model'

export interface ConnectModelHostOptions {
  /** Caller-owned cancellation; omitted, close() owns cancellation. */
  readonly signal?: AbortSignal
  /** Local host URL, authenticated separately by the bearer capability. */
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

interface HostAttachment {
  readonly headers: Readonly<Record<string, string>>
  readonly initial: ModelView
}

interface StreamLifecycle {
  /** Cancels every stream attachment and command owned by this connection. */
  readonly signal: AbortSignal
  /** Terminates the connection when a stream cannot be initialized or its data is invalid. */
  readonly onFailure: (error: unknown) => void
  /** Opens a fresh stream and snapshot after an established stream stops delivering data. */
  readonly onInterrupt: () => void
}

const attachModelHost = async (
  options: ConnectModelHostOptions,
  lifecycle: StreamLifecycle,
): Promise<HostAttachment> => {
  const CONNECTION_LIMIT = 30_000
  const deadline = AbortSignal.timeout(CONNECTION_LIMIT)
  const {signal, onFailure, onInterrupt} = lifecycle
  const timeout = () => onFailure(new Error('Backend did not send an initial model'))
  deadline.addEventListener('abort', timeout, {once: true})
  // Each stream owns its renderer and provisional edits; an old close cannot detach its replacement.
  const clientId = crypto.randomUUID()
  const headers = {Authorization: `Bearer ${options.token}`, 'X-Poffo-Client': clientId}
  try {
    const response = await fetch(
      `${options.url}/api/events?initial=metadata&clientId=${clientId}`,
      {
        headers,
        signal,
      },
    )
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
      if (event.sequence > sequence) {
        view = applyModelEvent(view, event)
        sequence = event.sequence
        options.onEvent(event)
      }
    }
    const consume = async () => {
      const decode = createLineDecoder()
      let interrupted = false
      const read = () =>
        reader.read().catch((error: unknown) => {
          interrupted = true
          throw error
        })
      try {
        while (true) {
          // WebKit can abort an idle response. Reattach on that completion signal, never on a timer.
          // eslint-disable-next-line no-await-in-loop
          const chunk = await read()
          if (chunk.done) {
            interrupted = true
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
        initialReject(error)
        if (!interrupted || view === undefined || signal.aborted) {
          interrupted = false
          onFailure(error)
        }
      } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      if (interrupted) {
        onInterrupt()
      }
    }
    consume().catch(onFailure)
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
      initialReject(error)
      onFailure(error)
    })
    return {headers, initial: await initial}
  } finally {
    deadline.removeEventListener('abort', timeout)
  }
}

/** Attaches to an event-driven stream; the caller closes it when the GUI is disposed. */
export const connectModelHost = async (options: ConnectModelHostOptions) => {
  const controller = new AbortController()
  const signal =
    options.signal === undefined
      ? controller.signal
      : AbortSignal.any([options.signal, controller.signal])
  let intentional = false
  let disconnected = false
  let attachment!: Promise<HostAttachment>
  const disconnect = (error: unknown) => {
    if (intentional || disconnected) {
      return
    }
    disconnected = true
    controller.abort(error)
    options.onDisconnect(error instanceof Error ? error.message : 'Backend disconnected')
  }
  const attach = () => {
    attachment = attachModelHost(options, {onFailure: disconnect, onInterrupt: attach, signal})
    attachment.catch(disconnect)
  }
  attach()
  const established = await attachment
  return {
    close: () => {
      intentional = true
      controller.abort()
    },
    initial: established.initial,
    send: async (operation: string, input: unknown) => {
      const {headers} = await attachment
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
