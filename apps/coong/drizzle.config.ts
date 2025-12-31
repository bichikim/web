import dotenv from 'dotenv'
import {defineConfig} from 'drizzle-kit'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

dotenv.config({
  override: true,
  path: path.resolve(configDir, process.env.DOTENV ?? '.env'),
})

export default defineConfig({
  /**
   * use snake_case for table name whatever key case is
   */
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  /**
   * postgres is Vercel x Supabase
   * @see https://vercel.com/bichis-projects/web/stores
   */
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/server/db/schema',
})
