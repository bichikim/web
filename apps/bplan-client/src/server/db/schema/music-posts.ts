import {integer, pgTable, serial, text} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {users} from './users'
import {timestamps} from '../fragments'

export const musicPosts = pgTable('music_posts', {
  authorId: integer(),
  content: text().notNull(),
  id: serial().primaryKey(),
  title: text().notNull(),
  ...timestamps,
})

export const musicPostsRelations = relations(musicPosts, ({one, many}) => ({
  author: one(users, {
    fields: [musicPosts.authorId],
    references: [users.id],
  }),
  comments: many(musicPostsComments),
}))

export const musicPostsComments = pgTable('music_posts_comments', {
  authorId: integer(),
  content: text().notNull(),
  id: serial().primaryKey(),
  postId: integer(),
  ...timestamps,
})

export const musicPostsCommentsRelations = relations(musicPostsComments, ({one}) => ({
  author: one(users, {
    fields: [musicPostsComments.authorId],
    references: [users.id],
  }),
  post: one(musicPosts, {
    fields: [musicPostsComments.postId],
    references: [musicPosts.id],
  }),
}))
