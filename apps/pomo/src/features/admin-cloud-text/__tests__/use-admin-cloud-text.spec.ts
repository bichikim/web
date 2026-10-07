/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {readAdminCloudTextUsers, resetAdminCloudTextUsage, updateAdminCloudTextLimit} from '../api'
import type {AdminCloudTextPage, AdminCloudTextUser} from '../contracts'
import {useAdminCloudText} from '../use-admin-cloud-text'
import {ADMIN_USER} from './fixtures/user'

vi.mock('../api', () => ({
  readAdminCloudTextUsers: vi.fn(),
  resetAdminCloudTextUsage: vi.fn(),
  updateAdminCloudTextLimit: vi.fn(),
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: [ADMIN_USER]})
})
it('should preserve displayed usage and expose failure when reset is forbidden', async () => {
  vi.mocked(resetAdminCloudTextUsage).mockResolvedValue({kind: 'forbidden'})
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1), {interval: 1})
  await result.resetUsage(ADMIN_USER.id)
  expect(result.users()).toEqual([ADMIN_USER])
  expect(result.feedback()).toBe('forbidden')
  expect(result.savingUserId()).toBe(null)
})
it('should append cursor pages once and reload the first page on refresh', async () => {
  const second = {...ADMIN_USER, id: '00000000-0000-4000-8000-000000000002'}
  vi.mocked(readAdminCloudTextUsers)
    .mockResolvedValueOnce({nextCursor: ADMIN_USER.id, users: [ADMIN_USER]})
    .mockResolvedValueOnce({nextCursor: null, users: [second]})
    .mockResolvedValueOnce({nextCursor: null, users: [ADMIN_USER]})
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1), {interval: 1})
  result.loadMore()
  await waitFor(() => expect(result.users()).toEqual([ADMIN_USER, second]), {interval: 1})
  expect(readAdminCloudTextUsers).toHaveBeenNthCalledWith(
    2,
    {cursor: ADMIN_USER.id},
    expect.anything(),
  )
  result.refresh()
  await waitFor(() => expect(result.users()).toEqual([ADMIN_USER]), {interval: 1})
  expect(result.hasMore()).toBe(false)
})
it('should ignore an obsolete search response after a new query completes', async () => {
  const pending = createDeferred<AdminCloudTextPage>()
  vi.mocked(readAdminCloudTextUsers)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({nextCursor: null, users: []})
  const {result} = renderHook(useAdminCloudText)
  result.search('00000000-0000-4000-8000-000000000002')
  await waitFor(() => expect(result.isLoading()).toBe(false))
  pending.resolve({nextCursor: null, users: [ADMIN_USER]})
  await pending.promise
  expect(result.users()).toEqual([])
})
it('should preserve usage and expose updated remaining allowance after saving', async () => {
  const changed: AdminCloudTextUser = {
    ...ADMIN_USER,
    dailyLimitOverride: 5,
    usage: {...ADMIN_USER.usage, limit: 5, remaining: 4},
  }
  vi.mocked(updateAdminCloudTextLimit).mockResolvedValue({kind: 'updated', user: changed})
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1), {interval: 1})
  await result.saveLimit({dailyLimit: 5, userId: ADMIN_USER.id})
  expect(result.users()).toEqual([changed])
  expect(result.feedback()).toBe('updated')
  expect(result.savingUserId()).toBe(null)
})
it('should keep previous values after a failed update', async () => {
  vi.mocked(updateAdminCloudTextLimit).mockResolvedValue({kind: 'unavailable'})
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1), {interval: 1})
  await result.saveLimit({dailyLimit: 5, userId: ADMIN_USER.id})
  expect(result.users()).toEqual([ADMIN_USER])
  expect(result.feedback()).toBe('unavailable')
})
it('should reject invalid searches and fractional limits before sending requests', async () => {
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.isLoading()).toBe(false))
  result.search('not-a-user')
  expect(readAdminCloudTextUsers).toHaveBeenCalledOnce()
  await result.saveLimit({dailyLimit: 1.5, userId: ADMIN_USER.id})
  expect(updateAdminCloudTextLimit).not.toHaveBeenCalled()
  expect(result.feedback()).toBe('invalid')
})
