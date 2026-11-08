import type {IncomingMessage, ServerResponse} from 'node:http'
import {timingSafeEqual} from 'node:crypto'
import {constants} from 'node:http2'
import type {ModelEvent} from '../model-events'
import {commandRequestSchema} from '../command-schemas'
import {readRequest, sendJson} from './http'
import {authorizeOrigin} from './authorize-origin'
import {serveStatic} from './serve-static'
import type {createCommandService} from '../create-command-service'
import type {createHostClients} from './create-host-clients'
import type {createRenderBroker} from './create-render-broker'

export type HostMiddleware = (request: IncomingMessage, response: ServerResponse) => void

interface HostHandlerOptions {
  readonly trustedOrigins?: ReadonlyArray<string>
  readonly snapshot: () => ModelEvent
  readonly token: string
  readonly url: () => string
  readonly isClosing: () => boolean
  readonly stop: (discard: boolean) => Promise<void>
  readonly canStop: () => boolean
  readonly service: ReturnType<typeof createCommandService>
  readonly clients: ReturnType<typeof createHostClients>
  readonly renderer: ReturnType<typeof createRenderBroker>
  readonly guiRoot?: string
}

const authorized = (request: IncomingMessage, options: HostHandlerOptions) => {
  const supplied = Buffer.from(request.headers.authorization?.replace(/^Bearer /u, '') ?? '')
  const expected = Buffer.from(options.token)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

const handleCommand = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: HostHandlerOptions,
) => {
  const parsed = commandRequestSchema.safeParse(await readRequest(request))
  if (!parsed.success) {
    sendJson(response, {error: 'invalid-request'}, constants.HTTP_STATUS_BAD_REQUEST)
    return
  }
  if (options.isClosing()) {
    sendJson(response, {error: 'closing'}, constants.HTTP_STATUS_SERVICE_UNAVAILABLE)
    return
  }
  options.clients.associate(request.headers['x-poffo-client'], parsed.data.input)
  sendJson(response, {
    ...(await options.service.execute(parsed.data)),
    sequence: options.clients.sequence(),
  })
}

const handleStop = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: HostHandlerOptions,
) => {
  const body = await readRequest(request)
  const discard =
    typeof body === 'object' && body !== null && 'discard' in body && body.discard === true
  if (!discard && !options.canStop()) {
    sendJson(response, {error: 'unsaved-document'}, constants.HTTP_STATUS_CONFLICT)
    return
  }
  // The descriptor is removed only after shutdown completes; CLI watches it after this acknowledgement.
  sendJson(response, {ok: true})
  await options.stop(discard)
}

const handleRenderResult = async (
  request: IncomingMessage,
  response: ServerResponse,
  options: HostHandlerOptions,
) => {
  const completed = options.renderer.complete(
    request.headers['x-poffo-client'],
    await readRequest(request),
  )
  sendJson(
    response,
    {ok: completed},
    completed ? constants.HTTP_STATUS_OK : constants.HTTP_STATUS_CONFLICT,
  )
}

export const createHostHandler = (options: HostHandlerOptions) => {
  let middleware: HostMiddleware | undefined
  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    const route = new URL(request.url ?? '/', options.url() || 'http://127.0.0.1')
    if (!route.pathname.startsWith('/api/')) {
      if (middleware !== undefined) {
        middleware(request, response)
      } else if (options.guiRoot === undefined) {
        sendJson(response, {error: 'GUI assets unavailable'}, constants.HTTP_STATUS_NOT_FOUND)
      } else {
        await serveStatic(options.guiRoot, request, response)
      }
      return
    }
    if (
      !authorizeOrigin({
        request,
        response,
        trustedOrigins: options.trustedOrigins,
        url: options.url(),
      })
    ) {
      sendJson(response, {error: 'unauthorized'}, constants.HTTP_STATUS_UNAUTHORIZED)
      return
    }
    if (response.writableEnded) {
      return
    }
    if (!authorized(request, options)) {
      sendJson(response, {error: 'unauthorized'}, constants.HTTP_STATUS_UNAUTHORIZED)
      return
    }
    if (options.isClosing()) {
      sendJson(response, {error: 'closing'}, constants.HTTP_STATUS_SERVICE_UNAVAILABLE)
      return
    }
    if (route.pathname === '/api/snapshot' && request.method === 'GET') {
      sendJson(response, options.snapshot())
      return
    }
    if (route.pathname === '/api/events' && request.method === 'GET') {
      response.writeHead(constants.HTTP_STATUS_OK, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/x-ndjson',
      })
      options.clients.attach(
        route.searchParams.get('clientId'),
        response,
        route.searchParams.get('initial') === 'metadata',
      )
      return
    }
    if (route.pathname === '/api/render-result' && request.method === 'POST') {
      await handleRenderResult(request, response, options)
      return
    }
    if (route.pathname === '/api/stop' && request.method === 'POST') {
      await handleStop(request, response, options)
      return
    }
    if (route.pathname === '/api/command' && request.method === 'POST') {
      await handleCommand(request, response, options)
      return
    }
    sendJson(response, {error: 'not-found'}, constants.HTTP_STATUS_NOT_FOUND)
  }
  return {
    handle: (request: IncomingMessage, response: ServerResponse) => {
      handle(request, response).catch((error: unknown) =>
        sendJson(
          response,
          {error: error instanceof Error ? error.message : 'Request failed'},
          constants.HTTP_STATUS_BAD_REQUEST,
        ),
      )
    },
    setMiddleware: (next: HostMiddleware) => {
      middleware = next
    },
  }
}
