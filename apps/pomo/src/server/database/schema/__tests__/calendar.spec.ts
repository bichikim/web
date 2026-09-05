import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {calendarConnections, calendarOauthStates, calendarProviderEnum} from '../calendar'
import {pomoUsers} from '../users'

it('should separate provider accounts and expiring OAuth states by Pomo user', () => {
  const connectionConfig = getTableConfig(calendarConnections)
  const stateConfig = getTableConfig(calendarOauthStates)

  expect(calendarProviderEnum.enumValues).toEqual(['google', 'microsoft'])
  expect(connectionConfig.indexes).toHaveLength(2)
  expect(stateConfig.indexes).toHaveLength(1)
  expect(connectionConfig.foreignKeys[0]?.reference().foreignTable).toBe(pomoUsers)
  expect(stateConfig.foreignKeys[0]?.reference().foreignTable).toBe(pomoUsers)
})
