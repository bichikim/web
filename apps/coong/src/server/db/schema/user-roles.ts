import {pgPolicy, pgTable, text, uuid} from 'drizzle-orm/pg-core'
import {sql} from 'drizzle-orm'
import {authenticatedRole} from 'drizzle-orm/supabase'
import {timestamps} from '../fragments'
import {profiles} from './profiles'
import {type SchemaSelf, type PgColumnBuilderBase, createOwnerOnlyCondition} from '../policies'

/**
 * Creates SQL condition that checks if the current user has "$admin" role
 * @returns SQL condition that returns true if user has admin role
 */
export const createAdminOnlyCondition = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  table: SchemaSelf<TTableName, TColumnsMap>,
) => {
  return sql`EXISTS (
    SELECT 1 FROM ${table}
    WHERE ${table.ownerId} = auth.uid()
    AND ${table.role} = '$admin'
  )`
}

// Role type
export type UserRole = '$admin' | 'general'

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid().primaryKey(),
    ownerId: uuid()
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    role: text().notNull().$type<UserRole>(),
    ...timestamps,
  },
  (table) => {
    return [
      // RLS policy for insert: only allow if user has "$admin" role
      pgPolicy('user_roles_insert_policy', {
        for: 'insert',
        to: authenticatedRole,
        withCheck: createAdminOnlyCondition(table),
      }),
      // RLS policy for update: only allow if user has "$admin" role
      pgPolicy('user_roles_update_policy', {
        for: 'update',
        to: authenticatedRole,
        using: createAdminOnlyCondition(table),
        withCheck: createAdminOnlyCondition(table),
      }),
      // RLS policy for delete: only allow if user has "$admin" role
      pgPolicy('user_roles_delete_policy', {
        for: 'delete',
        to: authenticatedRole,
        using: createAdminOnlyCondition(table),
      }),
      // RLS policy for select: allow users to see their own records or if they have admin role
      pgPolicy('user_roles_select_policy', {
        for: 'select',
        to: authenticatedRole,
        using: sql`${createOwnerOnlyCondition(table, 'ownerId')} OR ${createAdminOnlyCondition(table)}`,
      }),
    ]
  },
).enableRLS()
