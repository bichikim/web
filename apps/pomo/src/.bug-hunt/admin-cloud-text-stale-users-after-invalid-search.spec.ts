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

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readAdminCloudTextUsers).mockResolvedValue({nextCursor: null, users: [ADMIN_USER]})
})

it('should clear displayed users when the search input is invalid', async () => {
  const {result} = renderHook(useAdminCloudText)
  await waitFor(() => expect(result.users()).toHaveLength(1))

  result.search('not-a-user')

  expect(result.feedback()).toBe('invalid')
  expect(readAdminCloudTextUsers).toHaveBeenCalledOnce()
  expect(result.users()).toEqual([])
})
