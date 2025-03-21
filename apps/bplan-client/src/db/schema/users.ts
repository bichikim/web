import {integer, pgTable, serial, varchar} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {timestamps} from '../fragments'
import {musicPosts} from './music-posts'

export const users = pgTable('users', {
  age: integer().notNull(),
  email: varchar({length: 255}).notNull(),
  id: serial().primaryKey(),
  name: varchar({length: 255}).notNull(),
  password: varchar({length: 255}).notNull(),
  ...timestamps,
})

export const usersRelations = relations(users, ({many}) => ({
  posts: many(musicPosts),
}))
