/** @vitest-environment node */

import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, expectTypeOf, it} from 'vitest'
import {FEATURE_REQUEST_STATUSES} from 'src/features/feature-requests/types'

import {featureRequests, featureRequestStatusEnum, featureRequestVotes} from '../feature-requests'

it('should define feature request statuses and constraints for shared requests and votes', () => {
  expect(featureRequestStatusEnum.enumValues).toEqual([
    'requested',
    'voting',
    'confirmed',
    'completed',
  ])
  expect(featureRequestStatusEnum.enumValues).not.toBe(FEATURE_REQUEST_STATUSES)
  expectTypeOf(featureRequestStatusEnum.enumValues).toEqualTypeOf<
    ['requested', 'voting', 'confirmed', 'completed']
  >()
  expect(getTableConfig(featureRequests)).toMatchObject({
    checks: [expect.any(Object)],
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object)],
  })
  expect(getTableConfig(featureRequestVotes)).toMatchObject({
    foreignKeys: [expect.any(Object), expect.any(Object)],
    indexes: [expect.any(Object)],
    primaryKeys: [expect.any(Object)],
  })
})
