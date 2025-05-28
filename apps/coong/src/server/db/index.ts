import {drizzle} from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {getSupabaseUrl} from 'src/env'

const client = postgres(getSupabaseUrl())
export const db = drizzle({casing: 'snake_case', client})
