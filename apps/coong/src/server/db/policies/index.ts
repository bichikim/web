import {type BuildExtraConfigColumns} from 'drizzle-orm'
import {type PgColumnBuilderBase} from 'drizzle-orm/pg-core'
import {sql, type SQL} from 'drizzle-orm'
import {profiles} from '../schema/profiles'

export type SchemaSelf<
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> = BuildExtraConfigColumns<TTableName, TColumnsMap, 'pg'>

export {type PgColumnBuilderBase} from 'drizzle-orm/pg-core'

export type SchemaFn = (table: SchemaSelf<string, Record<string, PgColumnBuilderBase>>) => SQL<unknown>

export const createOwnerOnlyCondition = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  table: SchemaSelf<TTableName, TColumnsMap>,
  uidFieldKey: keyof TColumnsMap,
) => {
  return sql`${table[uidFieldKey]} = auth.uid()`
}

export const createAllowAllCondition = () => {
  return sql`true`
}

export const createMemberOnlyCondition = (): SQL<boolean> => {
  return sql`EXISTS (
    SELECT 1 FROM ${profiles}
    WHERE ${profiles.id} = auth.uid()
  )`
}
