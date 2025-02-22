// 'use server'
import {APIEvent} from '@solidjs/start/server'
import {fetchRequestHandler} from '@trpc/server/adapters/fetch'
import {appRouter} from 'src/trpc/routes'
import {TRPC_ENDPOINT} from 'src/trpc/consts'

// define the handler for handling requests
const handler = (event: APIEvent) => {
  'use server'

  // adapts tRPC to fetch API style requests
  return fetchRequestHandler({
    // any arbitary data that should be available to all actions
    createContext: () => ({foo: 'bar'}),

    // the endpoint handling the requests
    endpoint: TRPC_ENDPOINT,

    // the request object
    req: event.request,

    // the router for handling the requests
    router: appRouter,
  })
}

export const GET = handler
export const POST = handler
