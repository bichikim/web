import {procedure, router} from 'src/trpc/init'

export const authRouter = router({
  login: procedure.mutation(() => {
    return 'Hello, world!'
  }),
})
