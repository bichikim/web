import {integer, pgTable, serial, text, uuid} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {profiles} from './users'
import {timestamps} from '../fragments'

export const musicPosts = pgTable('music_posts', {
  authorId: uuid()
    .notNull()
    .references(() => profiles.id),
  content: text().notNull(),
  id: uuid().primaryKey(),
  title: text().notNull(),
  ...timestamps,
})

export const musicPostsRelations = relations(musicPosts, ({one, many}) => ({
  author: one(profiles, {
    fields: [musicPosts.authorId],
    references: [profiles.id],
  }),
  comments: many(musicPostComments),
}))

export const musicPostComments = pgTable('music_posts_comments', {
  authorId: uuid()
    .notNull()
    .references(() => profiles.id),
  content: text().notNull(),
  id: uuid().primaryKey(),
  postId: uuid()
    .notNull()
    .references(() => musicPosts.id),
  ...timestamps,
})

export const musicPostsCommentsRelations = relations(musicPostComments, ({one}) => ({
  author: one(profiles, {
    fields: [musicPostComments.authorId],
    references: [profiles.id],
  }),
  post: one(musicPosts, {
    fields: [musicPostComments.postId],
    references: [musicPosts.id],
  }),
}))
