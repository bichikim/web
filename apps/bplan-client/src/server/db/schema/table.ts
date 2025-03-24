import {pgTable, serial} from 'drizzle-orm/pg-core'

export const table = pgTable('table', {
  serial: serial('serial'),
})
