import {procedure, router} from 'src/trpc/init'
import {userRouter} from './user'
import {authRouter} from './auth'

export const appRouter = router({
  auth: authRouter,
  hello: procedure.query(() => {
    return 'Hello, world!'
  }),
  user: userRouter,
})

export type AppRouter = typeof appRouter
