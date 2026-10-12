/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {readAdminCloudTextUsers} from 'src/features/admin-cloud-text/api'
import {useAdminCloudText} from 'src/features/admin-cloud-text/use-admin-cloud-text'
import {ADMIN_USER} from 'src/features/admin-cloud-text/__tests__/fixtures/user'

vi.mock('src/features/admin-cloud-text/api', () => ({
  readAdminCloudTextUsers: vi.fn(),
  resetAdminCloudTextUsage: vi.fn(),
  updateAdminCloudTextLimit: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

it('should not keep the previous page of users when the current query fails', async () => {
  vi.mocked(readAdminCloudTextUsers)
    .mockResolvedValueOnce({nextCursor: null, users: [ADMIN_USER]})
    .mockRejectedValueOnce(new Error('offline'))

  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1))

  result.search('00000000-0000-4000-8000-000000000002')
  await waitFor(() => expect(result.loadFailed()).toBe(true))

  expect(result.users()).toEqual([])
})
