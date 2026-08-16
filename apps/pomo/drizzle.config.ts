import dotenv from 'dotenv'
import {defineConfig} from 'drizzle-kit'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getMigrationDatabaseUrl} from './src/server/database/environment'

const configDirectory = fileURLToPath(new URL('.', import.meta.url))

dotenv.config({
  path: path.resolve(configDirectory, process.env.DOTENV ?? '.env'),
})

export default defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url: getMigrationDatabaseUrl(),
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/server/database/schema',
})
