import type {Middleware} from 'h3'
import {getRequestEvent} from 'solid-js/web'

export const authenticationMiddleware: Middleware = (event, next) => {
  const requestEvent = getRequestEvent()
  if (requestEvent === undefined) {
    throw new Error('SolidStart request context is unavailable')
  }

  requestEvent.locals.authentication = {request: event.req}
  return next()
}
