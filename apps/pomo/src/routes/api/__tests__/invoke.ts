import type {APIEvent, APIHandler} from '@solidjs/start/server'
import {H3} from 'h3'

/** Invokes a SolidStart API export through H3 response serialization. */
export const invokeApiRoute = (
  handler: APIHandler,
  request: Request,
  params: Readonly<Record<string, string>> = {},
): Promise<Response> => {
  const app = new H3().all('/**', (nativeEvent) => {
    const event: APIEvent = {
      locals: {},
      nativeEvent,
      params: {...params},
      request: nativeEvent.req,
      response: nativeEvent.res,
    }

    return handler(event)
  })

  return Promise.resolve(app.request(request))
}
