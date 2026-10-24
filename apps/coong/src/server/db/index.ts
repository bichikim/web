import {drizzle} from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {getPostgresUrl} from 'src/env'

const client = postgres(getPostgresUrl())
export const db = drizzle({casing: 'snake_case', client})
