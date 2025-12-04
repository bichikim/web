import {integer, pgPolicy, pgTable, text, uuid} from 'drizzle-orm/pg-core'
import {relations, sql} from 'drizzle-orm'
import {timestamps} from '../fragments'
import {authenticatedRole, authUid, authUsers} from 'drizzle-orm/supabase'
import {musicPostComments, musicPosts} from './music-posts'
import {createOwnerOnlyCondition, createMemberOnlyCondition} from '../policies'

export const profiles = pgTable(
  'profiles',
  {
    age: integer(),
    id: uuid()
      .primaryKey()
      .notNull()
      .references(() => authUsers.id, {onDelete: 'cascade'}),
    image: text(),
    name: text(),
    ...timestamps,
  },
  (table) => [
    // RLS policy for insert: only allow if id matches auth.uid()
    pgPolicy('profiles_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: createOwnerOnlyCondition(table, 'id'),
    }),
    // RLS policy for update: only allow if id matches auth.uid()
    pgPolicy('profiles_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: createOwnerOnlyCondition(table, 'id'),
      withCheck: createOwnerOnlyCondition(table, 'id'),
    }),
    // RLS policy for delete: only allow if id matches auth.uid()
    pgPolicy('profiles_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: createOwnerOnlyCondition(table, 'id'),
    }),
    // RLS policy for select: allow all authenticated users to read profiles
    pgPolicy('profiles_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: createMemberOnlyCondition(),
    }),
  ],
).enableRLS()

export const usersRelations = relations(profiles, ({many}) => ({
  musicPostComments: many(musicPostComments),
  musicPosts: many(musicPosts),
}))
