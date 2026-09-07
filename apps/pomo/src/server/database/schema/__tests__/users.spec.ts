import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  pomoAccountLinkAttemptLimits,
  pomoAccountLinkChallenges,
  pomoAppSessions,
  pomoIdentities,
  pomoIdentityProviderEnum,
  pomoUsers,
} from '../users'

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
