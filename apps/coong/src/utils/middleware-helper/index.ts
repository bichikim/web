import type {RequestMiddleware, ResponseMiddleware} from '@solidjs/start/middleware'

export interface MiddlewareFragment {
  onBeforeResponse?: ResponseMiddleware | ResponseMiddleware[]
  onRequest?: RequestMiddleware | RequestMiddleware[]
}

export const createMiddlewareFragment = (fragment: MiddlewareFragment): MiddlewareFragment => {
  return fragment
}

export const mergeMiddleware = (...middlewares: MiddlewareFragment[]): MiddlewareFragment => {
  const _onBeforeResponse: MiddlewareFragment['onBeforeResponse'] = []
  const _onRequest: MiddlewareFragment['onRequest'] = []

  for (const middleware of middlewares) {
    const {onBeforeResponse, onRequest} = middleware

    if (Array.isArray(onBeforeResponse)) {
      _onBeforeResponse.push(...onBeforeResponse)
    } else if (onBeforeResponse) {
      _onBeforeResponse.push(onBeforeResponse)
    }

    if (Array.isArray(onRequest)) {
      _onRequest.push(...onRequest)
    } else if (onRequest) {
      _onRequest.push(onRequest)
    }
  }

  return {
    onBeforeResponse: _onBeforeResponse,
    onRequest: _onRequest,
  }
}
