import {procedure, router} from 'src/server/trpc/init'

export const userRouter = router({
  getUser: procedure.query(() => {
    return 'Hello, world!'
  }),
})
