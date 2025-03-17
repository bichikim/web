import {procedure, router} from 'src/trpc/init'
import {userRouter} from './user'
import {authRouter} from './auth'
import {getWindow} from '@winter-love/utils'

export const appRouter = router({
  auth: authRouter,
  hello: procedure.query(() => {
    return 'Hello, world!'
  }),
  user: userRouter,
})

if (getWindow()) {
  console.error('This is a server-only router')
}

export type AppRouter = typeof appRouter
