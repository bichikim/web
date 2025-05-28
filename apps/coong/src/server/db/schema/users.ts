import {boolean, integer, pgSchema, pgTable, primaryKey, text, timestamp, uuid} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {timestamps} from '../fragments'
import {musicPostComments, musicPosts} from './music-posts'

export const authSchema = pgSchema('auth')

export const authUsers = authSchema.table('users', {
  id: uuid().primaryKey().notNull(),
})

export const profiles = pgTable('profiles', {
  age: integer(),
  id: uuid()
    .primaryKey()
    .notNull()
    .references(() => authUsers.id, {onDelete: 'cascade'}),
  image: text(),
  name: text(),
  ...timestamps,
})

export const usersRelations = relations(profiles, ({many}) => ({
  musicPostComments: many(musicPostComments),
  musicPosts: many(musicPosts),
}))
