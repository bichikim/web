import {procedure, router} from 'src/trpc/init'

export const userRouter = router({
  getUser: procedure.query(() => {
    return 'Hello, world!'
  }),
})
