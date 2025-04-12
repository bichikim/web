import {drizzle} from 'drizzle-orm/neon-http'
import {neon} from '@neondatabase/serverless'
import {getDatabaseUrl} from 'src/env'

const sql = neon(getDatabaseUrl())
export const db = drizzle({casing: 'snake_case', client: sql})
