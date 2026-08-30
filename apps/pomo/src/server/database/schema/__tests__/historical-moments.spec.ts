import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  historicalEraEnum,
  historicalMoments,
  historicalMomentSources,
  historicalMomentStatusEnum,
} from '../historical-moments'

it('should expose historical moment constraints, indexes, and references', () => {
  const momentConfig = getTableConfig(historicalMoments)
  const sourceConfig = getTableConfig(historicalMomentSources)

  expect(historicalEraEnum.enumValues).toEqual(['bce', 'ce'])
  expect(historicalMomentStatusEnum.enumValues).toEqual(['draft', 'published', 'archived'])
  expect(momentConfig).toMatchObject({
    checks: [expect.any(Object), expect.any(Object), expect.any(Object)],
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object), expect.any(Object)],
  })
  expect(sourceConfig).toMatchObject({
    checks: [expect.any(Object)],
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object)],
  })
  expect(momentConfig.foreignKeys[0]?.reference().foreignTable).toBeDefined()
  expect(sourceConfig.foreignKeys[0]?.reference().foreignTable).toBe(historicalMoments)
})
