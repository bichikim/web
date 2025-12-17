import type {ResponseMiddleware, RequestMiddleware} from '@solidjs/start/middleware'
import {createMiddleware} from '@solidjs/start/middleware'

export type MiddlewareFragment = Parameters<typeof createMiddleware>[0]

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
