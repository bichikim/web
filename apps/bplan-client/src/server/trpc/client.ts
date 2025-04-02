import type {AppRouter} from './routes'
import {createTRPCClient, httpBatchLink, loggerLink} from '@trpc/client'
import {joinURL} from 'ufo'
import {getSelfUrl} from 'src/env'
import {TRPC_ENDPOINT} from './consts'

export type {AppRouter} from './routes'

// create the client, export it
export const client = createTRPCClient<AppRouter>({
  links: [
    // will print out helpful logs when using client
    loggerLink(),
    // identifies what url will handle trpc requests
    httpBatchLink({url: joinURL(getSelfUrl(), TRPC_ENDPOINT)}),
  ],
})
