import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {withNoStore} from '../http/response'
import {readNeonAuthProxyConfig} from 'src/server/auth/neon-config'

interface AuthProxyEvent {
  readonly params: {
    readonly path: string
  }
  readonly request: Request
}

const authPathMethods = new Map<string, ReadonlySet<string>>([
  ['get-session', new Set(['GET'])],
  ['magic-link/verify', new Set(['GET'])],
  ['sign-in/magic-link', new Set(['POST'])],
  ['sign-out', new Set(['POST'])],
])

export const isAuthProxyRequestAllowed = (path: string, method: string): boolean =>
  authPathMethods.get(path)?.has(method) ?? false

const createUnavailableResponse = (): Response =>
  Response.json({error: 'Authentication is not configured'}, {status: 503})

export const handlePomoAuthProxy = async (event: AuthProxyEvent): Promise<Response> => {
  const {path} = event.params

  if (!isAuthProxyRequestAllowed(path, event.request.method)) {
    return withNoStore(new Response(null, {status: 404}))
  }

  try {
    return withNoStore(
      await handleAuthProxyRequest({
        ...readNeonAuthProxyConfig(),
        path,
        request: event.request,
      }),
    )
  } catch (error) {
    console.error('Pomo auth proxy is unavailable', error)
    return withNoStore(createUnavailableResponse())
  }
}
