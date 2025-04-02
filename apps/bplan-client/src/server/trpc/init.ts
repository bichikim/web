import {initTRPC} from '@trpc/server'

// Create TRPC Server
export const trpc = initTRPC.create()

export const {router, middleware, procedure} = trpc
