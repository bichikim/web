import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  historicalEraEnum,
  historicalMoments,
  historicalMomentSources,
  historicalMomentStatusEnum,
} from '../historical-moments'
import {
  pomoAccountLinkAttemptLimits,
  pomoAccountLinkChallenges,
  pomoAppSessions,
  pomoIdentities,
  pomoIdentityProviderEnum,
  pomoUsers,
} from '../users'
import {
  historicalGenerationRuns,
  historicalGenerationStatusEnum,
  processedOpenAiWebhookEvents,
} from '../historical-generation-runs'
import {
  weather,
  weatherCollectionState,
  weatherLocations,
  weatherPrecipitationEnum,
  weatherProviderUsage,
  weatherSkyEnum,
} from '../weather'

it('should expose the complete user and identity schema configuration', () => {
  const identityConfig = getTableConfig(pomoIdentities)
  const sessionConfig = getTableConfig(pomoAppSessions)
  const attemptLimitConfig = getTableConfig(pomoAccountLinkAttemptLimits)
  const challengeConfig = getTableConfig(pomoAccountLinkChallenges)
  expect(pomoIdentityProviderEnum.enumValues).toEqual(['neon', 'toss'])
  expect(getTableConfig(pomoUsers).name).toBe('pomo_users')
  expect(identityConfig).toMatchObject({
    foreignKeys: expect.arrayContaining([expect.any(Object)]),
    indexes: expect.arrayContaining([expect.any(Object), expect.any(Object)]),
  })
  expect(sessionConfig).toMatchObject({
    foreignKeys: expect.arrayContaining([expect.any(Object)]),
    indexes: expect.arrayContaining([
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    ]),
  })
  expect(attemptLimitConfig).toMatchObject({
    checks: [expect.any(Object)],
    foreignKeys: [expect.any(Object)],
  })
  expect(challengeConfig).toMatchObject({
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object), expect.any(Object)],
  })
  for (const foreignKey of [
    ...identityConfig.foreignKeys,
    ...sessionConfig.foreignKeys,
    ...attemptLimitConfig.foreignKeys,
    ...challengeConfig.foreignKeys,
  ]) {
    expect(foreignKey.reference().foreignTable).toBe(pomoUsers)
  }
})

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

it('should expose historical generation run constraints and indexes', () => {
  const runConfig = getTableConfig(historicalGenerationRuns)

  expect(historicalGenerationStatusEnum.enumValues).toEqual([
    'preparing',
    'submitted',
    'completed',
    'failed',
    'rejected',
  ])
  expect(runConfig).toMatchObject({
    checks: [expect.any(Object)],
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object), expect.any(Object), expect.any(Object)],
  })
  expect(runConfig.foreignKeys[0]?.reference().foreignTable).toBeDefined()
  expect(getTableConfig(processedOpenAiWebhookEvents).name).toBe('processed_openai_webhook_events')
})

it('should expose weather table constraints, enums, and indexes', () => {
  expect(weatherPrecipitationEnum.enumValues).toEqual(['none', 'rain', 'mixed', 'snow'])
  expect(weatherSkyEnum.enumValues).toEqual(['clear', 'cloudy', 'overcast'])
  expect(getTableConfig(weatherLocations)).toMatchObject({
    checks: [expect.any(Object), expect.any(Object)],
    indexes: [expect.any(Object)],
  })
  expect(getTableConfig(weather).indexes).toEqual([expect.any(Object)])
  expect(getTableConfig(weatherProviderUsage).checks).toEqual([
    expect.any(Object),
    expect.any(Object),
    expect.any(Object),
  ])
  expect(getTableConfig(weatherCollectionState).checks).toEqual([
    expect.any(Object),
    expect.any(Object),
  ])
})
