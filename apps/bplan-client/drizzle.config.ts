import 'dotenv/config'
import {defineConfig} from 'drizzle-kit'

export default defineConfig({
  /**
   * use snake_case for table name whatever key case is
   */
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  /**
   * postgres is Vercel Neno
   * @see https://vercel.com/bichis-projects/web/stores
   */
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/server/db/schema',
})
