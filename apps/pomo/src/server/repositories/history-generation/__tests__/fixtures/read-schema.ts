import {readFile} from 'node:fs/promises'

const MIGRATIONS = [
  '0000_sudden_klaw.sql',
  '0002_fuzzy_praxagora.sql',
  '0007_silly_pestilence.sql',
  '0015_overconfident_owl.sql',
] as const

const HISTORY_SCHEMA_NAMES = new Set([
  'feed_channels',
  'historical_era',
  'historical_generation_runs',
  'historical_generation_status',
  'historical_generation_submission_state',
  'historical_moment_sources',
  'historical_moment_status',
  'historical_moments',
  'processed_openai_webhook_events',
])

/** Reads the history tables, enums and constraints from their real migrations. */
export const readSchema = async (): Promise<string> => {
  const migrations = await Promise.all(
    MIGRATIONS.map((name) =>
      readFile(new URL(`../../../../../../drizzle/${name}`, import.meta.url), 'utf8'),
    ),
  )

  return migrations
    .flatMap((migration) => migration.split('--> statement-breakpoint'))
    .filter((statement) => {
      const declaration = statement.match(
        /^\s*(?:CREATE TABLE|ALTER TABLE|CREATE TYPE|ALTER TYPE)\s+(?:"public"\.)?"(?<name>[^"]+)"/u,
      )
      const index = /^\s*CREATE (?:UNIQUE )?INDEX/u.test(statement)
        ? statement.match(/\bON\s+(?:"public"\.)?"(?<name>[^"]+)"/u)
        : null
      const name = declaration?.groups?.name ?? index?.groups?.name
      return name !== undefined && HISTORY_SCHEMA_NAMES.has(name)
    })
    .join('\n')
}
