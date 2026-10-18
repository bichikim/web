import type {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'

export const prepareProductLimits = async (database: PGlite): Promise<void> => {
  await database.exec(
    'create table commerce_products (id uuid primary key); ' +
      'create table commerce_entitlement_grants (id uuid primary key, user_id uuid, product_id uuid, ' +
      'starts_at timestamptz, ends_at timestamptz, revoked_at timestamptz)',
  )
  await database.exec(
    await readFile(
      new URL('../../../../../drizzle/0026_cloud_text_product_limits.sql', import.meta.url),
      'utf8',
    ),
  )
}
