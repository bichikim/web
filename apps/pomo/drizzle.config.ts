import dotenv from 'dotenv'
import {defineConfig} from 'drizzle-kit'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const configDirectory = fileURLToPath(new URL('.', import.meta.url))

dotenv.config({
  path: path.resolve(configDirectory, process.env.DOTENV ?? '.env'),
})

const unpooledDatabaseUrl = process.env.DATABASE_URL_UNPOOLED?.trim()
const pooledDatabaseUrl = process.env.DATABASE_URL?.trim()
const migrationDatabaseUrl = unpooledDatabaseUrl || pooledDatabaseUrl

if (!migrationDatabaseUrl) {
  throw new TypeError('DATABASE_URL_UNPOOLED or DATABASE_URL is not set')
}

let parsedDatabaseUrl: URL

try {
  parsedDatabaseUrl = new URL(migrationDatabaseUrl)
} catch (cause) {
  throw new TypeError('Migration database URL must be a valid URL', {cause})
}

if (parsedDatabaseUrl.protocol !== 'postgres:' && parsedDatabaseUrl.protocol !== 'postgresql:') {
  throw new TypeError('Migration database URL must use the postgres or postgresql protocol')
}

export default defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/server/database/schema',
})
