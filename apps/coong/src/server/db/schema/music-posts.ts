import {integer, pgPolicy, pgTable, serial, text, uuid} from 'drizzle-orm/pg-core'
import {relations, sql} from 'drizzle-orm'
import {authenticatedRole} from 'drizzle-orm/supabase'
import {profiles} from './users'
import {timestamps} from '../fragments'

export const musicPosts = pgTable(
  'music_posts',
  {
    authorId: uuid()
      .notNull()
      .references(() => profiles.id),
    content: text().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    ...timestamps,
  },
  (table) => [
    // RLS policy for insert: only allow if authorId matches auth.uid()
    pgPolicy('music_posts_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for update: only allow if authorId matches auth.uid()
    pgPolicy('music_posts_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.authorId} = auth.uid()`,
      withCheck: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for delete: only allow if authorId matches auth.uid()
    pgPolicy('music_posts_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for select: allow all authenticated users to read
    pgPolicy('music_posts_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS()

export const musicPostsRelations = relations(musicPosts, ({one, many}) => ({
  author: one(profiles, {
    fields: [musicPosts.authorId],
    references: [profiles.id],
  }),
  comments: many(musicPostComments),
}))

export const musicPostComments = pgTable(
  'music_posts_comments',
  {
    authorId: uuid()
      .notNull()
      .references(() => profiles.id),
    content: text().notNull(),
    id: uuid().primaryKey(),
    postId: uuid()
      .notNull()
      .references(() => musicPosts.id),
    ...timestamps,
  },
  (table) => [
    // RLS policy for insert: only allow if authorId matches auth.uid()
    pgPolicy('music_post_comments_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for update: only allow if authorId matches auth.uid()
    pgPolicy('music_post_comments_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.authorId} = auth.uid()`,
      withCheck: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for delete: only allow if authorId matches auth.uid()
    pgPolicy('music_post_comments_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${table.authorId} = auth.uid()`,
    }),
    // RLS policy for select: allow all authenticated users to read
    pgPolicy('music_post_comments_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS()

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
