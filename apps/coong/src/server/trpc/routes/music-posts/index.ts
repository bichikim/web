import {procedure, router} from 'src/server/trpc/init'
import {db} from 'src/server/db'
import {musicPosts} from 'src/server/db/schema/music-posts'
import {eq} from 'drizzle-orm'
import {z} from 'zod'

const DEFAULT_LIMIT = 10
const DEFAULT_OFFSET = 0

export const musicPostsRouter = router({
  createMusicPost: procedure
    .input(
      z.object({
        content: z.string(),
        title: z.string(),
        userId: z.number(),
      }),
    )
    .mutation(({input}) => {
      return db.insert(musicPosts).values(input)
    }),
  deleteAllMusicPost: procedure.mutation(() => {
    return db.delete(musicPosts)
  }),
  deleteMusicPost: procedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(({input}) => {
      return db.delete(musicPosts).where(eq(musicPosts.id, input.id))
    }),
  getMusicPost: procedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(({input}) => {
      return db.select().from(musicPosts).where(eq(musicPosts.id, input.id))
    }),
  getMusicPostList: procedure
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
      }),
    )
    .query(({input}) => {
      const limit = input?.limit ?? DEFAULT_LIMIT
      const offset = input?.offset ?? DEFAULT_OFFSET

      return db.select().from(musicPosts).limit(limit).offset(offset)
    }),
  modifyMusicPost: procedure
    .input(
      z.object({
        content: z.string(),
        id: z.number(),
        title: z.string(),
      }),
    )
    .mutation(({input}) => {
      return db.update(musicPosts).set(input).where(eq(musicPosts.id, input.id))
    }),
})
