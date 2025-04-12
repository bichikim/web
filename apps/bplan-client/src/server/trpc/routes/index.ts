import {procedure, router} from 'src/server/trpc/init'
import {userRouter} from './user'
import {authRouter} from './auth'
import {getWindow} from '@winter-love/utils'
import {musicPostsRouter} from './music-posts'

export const appRouter = router({
  auth: authRouter,
  hello: procedure.query(() => {
    return 'Hello, world!'
  }),
  musicPosts: musicPostsRouter,
  user: userRouter,
})

if (getWindow()) {
  console.error('This is a server-only router')
}

export type AppRouter = typeof appRouter
