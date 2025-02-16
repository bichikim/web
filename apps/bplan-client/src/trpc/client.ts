import type {AppRouter} from './routes'
import {createTRPCProxyClient, httpBatchLink, loggerLink} from '@trpc/client'
import {joinURL} from 'ufo'
import {getSelfUrl} from 'src/utils/self-url'

export type {AppRouter} from './routes'

// create the client, export it
export const client = createTRPCProxyClient<AppRouter>({
  links: [
    // will print out helpful logs when using client
    loggerLink(),
    // identifies what url will handle trpc requests
    httpBatchLink({url: joinURL(getSelfUrl(), '/trpc')}),
  ],
})
