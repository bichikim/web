import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const unsafeRules = [
  {label: 'DROP changes schema destructively', pattern: /\bDROP\b/giu},
  {label: 'RENAME breaks the previous application schema', pattern: /\bRENAME\b/giu},
  {
    label: 'ALTER COLUMN changes an existing column contract',
    pattern: /\bALTER\s+COLUMN\b/giu,
  },
  {label: 'SET NOT NULL can reject existing data', pattern: /\bSET\s+NOT\s+NULL\b/giu},
  {
    label: 'TRUNCATE removes production data',
    pattern: /\bTRUNCATE\b/giu,
  },
  {
    label: 'DELETE must run as a separate data migration',
    pattern: /\bDELETE\b/giu,
  },
  {
    label: 'UPDATE must run as a separate data migration',
    pattern: /\bUPDATE\b/giu,
  },
]

const mask = (value) => value.replace(/[^\n]/gu, ' ')

const maskCommentsAndQuotedValues = (sql) =>
  sql
    .replace(/'(?:''|[^'])*'/gsu, mask)
    .replace(/"(?:""|[^"])*"/gsu, mask)
    .replace(/\/\*[\s\S]*?\*\//gu, mask)
    .replace(/--[^\n]*/gu, mask)

const maskAllowedDmlClauses = (sql) =>
  sql
    .replace(
      /\bON\s+(?:DELETE|UPDATE)\s+(?:NO\s+ACTION|RESTRICT|CASCADE|SET\s+(?:NULL|DEFAULT))\b/giu,
      mask,
    )
    .replace(/\bDO\s+UPDATE\b/giu, mask)

export const findUnsafeProductionMigrationStatements = (sql) => {
  const sanitizedSql = maskAllowedDmlClauses(maskCommentsAndQuotedValues(sql))
  const findings = []

  for (const rule of unsafeRules) {
    for (const match of sanitizedSql.matchAll(rule.pattern)) {
      const line = sanitizedSql.slice(0, match.index).split('\n').length
      findings.push({label: rule.label, line})
    }
  }

  return findings.sort((left, right) => left.line - right.line)
}

const checkProductionMigrations = async () => {
  const migrationsDirectory = fileURLToPath(new URL('../../drizzle/', import.meta.url))
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  const migrationFindings = await Promise.all(
    migrationFiles.map(async (migrationFile) => {
      const migrationPath = path.join(migrationsDirectory, migrationFile)
      const sql = await readFile(migrationPath, 'utf8')

      return findUnsafeProductionMigrationStatements(sql).map(
        (finding) => `${migrationFile}:${finding.line} ${finding.label}`,
      )
    }),
  )
  const unsafeMigrations = migrationFindings.flat()

  if (unsafeMigrations.length > 0) {
    throw new Error(
      `Production deployment accepts expand-only migrations:\n${unsafeMigrations.join('\n')}`,
    )
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isEntrypoint) {
  await checkProductionMigrations()
}
