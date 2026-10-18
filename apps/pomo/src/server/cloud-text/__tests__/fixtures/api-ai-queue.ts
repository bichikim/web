import type {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'

export const prepareApiAiQueue = async (database: PGlite): Promise<void> => {
  await database.exec(
    await readFile(
      new URL('../../../../../drizzle/0027_api_ai_queue.sql', import.meta.url),
      'utf8',
    ),
  )
  await database.exec(
    await readFile(
      new URL('../../../../../drizzle/0028_api_ai_routing.sql', import.meta.url),
      'utf8',
    ),
  )
}
