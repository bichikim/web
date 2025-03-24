import {procedure, router} from 'src/server/trpc/init'

export const authRouter = router({
  login: procedure.mutation(() => {
    return 'Hello, world!'
  }),
})
