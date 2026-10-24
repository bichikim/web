import {neon} from '@neondatabase/serverless'

export const getLastAppliedAt = async (databaseUrl) => {
  const query = neon(databaseUrl, {readOnly: true})
  const [{journal}] = await query`SELECT to_regclass('drizzle.__drizzle_migrations') AS journal`

  if (journal === null) {
    return 0
  }

  const [{lastAppliedAt}] =
    await query`SELECT max(created_at) AS "lastAppliedAt" FROM drizzle.__drizzle_migrations`

  return Number(lastAppliedAt ?? 0)
}
