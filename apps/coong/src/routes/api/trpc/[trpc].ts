'use server'
import {APIEvent} from '@solidjs/start/server'
import {fetchRequestHandler} from '@trpc/server/adapters/fetch'
import {appRouter} from 'src/server/trpc/routes'
import {TRPC_ENDPOINT} from 'src/server/trpc/consts'

// tRPC context 타입 정의
interface Context {
  //
  __naver__?: any
}

interface CreateContextArg {
  // info: TRPCRequestInfo
  req: Request
  resHeaders: Headers
}

// define the handler for handling requests
const handler = async (event: APIEvent) => {
  'use server'

  // adapts tRPC to fetch API style requests
  return fetchRequestHandler({
    createContext: async (context: CreateContextArg): Promise<Context> => {
      return {}
    },
    endpoint: TRPC_ENDPOINT,
    req: event.request,
    router: appRouter,
  })
}

export const GET = handler
export const POST = handler
