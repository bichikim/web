/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({env: {}}))

import {
  CREATE_OPTIONS,
  createRerunDatabase,
  createRun,
  prepareGenerationRerun,
} from '../server/repositories/history-generation/__tests__/index.test-support'

it('should accept regeneration titles that match published moments after NFKC trim normalization', async () => {
  const storedTitle = '  1945년,  역사적 사건  '
  const requestedTitle = '1945년, 역사적 사건'
  const existing = createRun('completed')
  const updated = {...existing, status: 'preparing' as const}
  const {database} = createRerunDatabase(existing, updated, [storedTitle])

  await expect(
    prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles: [requestedTitle]}, database),
  ).resolves.toMatchObject({status: 'preparing'})
})
