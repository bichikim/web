import {integer, pgPolicy, pgTable, text, uuid} from 'drizzle-orm/pg-core'
import {sql} from 'drizzle-orm'
import {authenticatedRole} from 'drizzle-orm/supabase'
import {timestamps} from '../fragments'

export const people = pgTable(
  'people',
  {
    age: integer(),
    email: text(),
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    ownerId: uuid().notNull(),
    phone: text(),
    ...timestamps,
  },
  (table) => [
    // RLS policy for insert: only allow if ownerId matches auth.uid() via profiles
    pgPolicy('people_insert_policy', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ${table.ownerId}
        AND profiles.id = (select auth.uid())
      )`,
    }),
    // RLS policy for update: only allow if ownerId matches auth.uid() via profiles
    pgPolicy('people_update_policy', {
      for: 'update',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ${table.ownerId}
        AND profiles.id = (select auth.uid())
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ${table.ownerId}
        AND profiles.id = (select auth.uid())
      )`,
    }),
    // RLS policy for delete: only allow if ownerId matches auth.uid() via profiles
    pgPolicy('people_delete_policy', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ${table.ownerId}
        AND profiles.id = (select auth.uid())
      )`,
    }),
    // RLS policy for select: only allow owner to read their people
    pgPolicy('people_select_policy', {
      for: 'select',
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = ${table.ownerId}
        AND profiles.id = (select auth.uid())
      )`,
    }),
  ],
).enableRLS()
