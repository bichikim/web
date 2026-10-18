import {beforeEach, expect, it, vi} from 'vitest'
import {apiJsonRequest} from 'src/features/api-json'
import {resetAdminCloudTextUsage, updateAdminCloudTextLimit} from '../api'
import {ADMIN_USER} from './fixtures/user'

vi.mock('src/features/api-json', async () => ({
  ...(await vi.importActual('src/features/api-json')),
  apiJsonRequest: vi.fn(),
}))
beforeEach(() => {
  vi.resetAllMocks()
})
it('should reset usage with an authenticated non-retrying POST and return the server values', async () => {
  const user = {...ADMIN_USER, usage: {...ADMIN_USER.usage, remaining: 3, used: 0}}
  vi.mocked(apiJsonRequest).mockResolvedValue(Response.json(user))
  expect(await resetAdminCloudTextUsage(ADMIN_USER.id)).toEqual({kind: 'updated', user})
  expect(apiJsonRequest).toHaveBeenCalledWith(`admin/cloud-text/${ADMIN_USER.id}/reset`, {
    credentials: 'include',
    method: 'POST',
    retry: false,
  })
})
it('should accept zero allowance returned by the server and preserve private request credentials', async () => {
  const user = {
    ...ADMIN_USER,
    dailyLimitOverride: 0,
    usage: {...ADMIN_USER.usage, limit: 0, remaining: 0},
  }
  vi.mocked(apiJsonRequest).mockResolvedValue(Response.json(user))
  expect(await updateAdminCloudTextLimit({dailyLimit: 0, userId: ADMIN_USER.id})).toEqual({
    kind: 'updated',
    user,
  })
  expect(apiJsonRequest).toHaveBeenCalledWith(`admin/cloud-text/${ADMIN_USER.id}`, {
    body: {dailyLimit: 0},
    credentials: 'include',
    method: 'PATCH',
    retry: false,
  })
})
it('should send an explicit null when restoring the default allowance', async () => {
  vi.mocked(apiJsonRequest).mockResolvedValue(Response.json(ADMIN_USER))
  expect(await updateAdminCloudTextLimit({dailyLimit: null, userId: ADMIN_USER.id})).toMatchObject({
    kind: 'updated',
  })
  expect(apiJsonRequest).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({body: {dailyLimit: null}}),
  )
})
it('should distinguish unlimited updates from restoring an automatic allowance', async () => {
  const user = {
    ...ADMIN_USER,
    dailyLimitOverride: 'unlimited',
    usage: {...ADMIN_USER.usage, limit: null, remaining: null},
  }
  vi.mocked(apiJsonRequest).mockResolvedValue(Response.json(user))
  expect(await updateAdminCloudTextLimit({dailyLimit: 'unlimited', userId: ADMIN_USER.id})).toEqual(
    {kind: 'updated', user},
  )
  expect(apiJsonRequest).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({body: {dailyLimit: 'unlimited'}}),
  )
})
it('should report a forbidden mutation without replacing user usage', async () => {
  vi.mocked(apiJsonRequest).mockResolvedValue(Response.json({error: 'forbidden'}, {status: 403}))
  expect(await updateAdminCloudTextLimit({dailyLimit: 5, userId: ADMIN_USER.id})).toEqual({
    kind: 'forbidden',
  })
})
it('should report unavailable when the server returns an invalid usage contract', async () => {
  vi.mocked(apiJsonRequest).mockResolvedValue(
    Response.json({...ADMIN_USER, usage: {...ADMIN_USER.usage, limit: -1}}),
  )
  expect(await updateAdminCloudTextLimit({dailyLimit: 5, userId: ADMIN_USER.id})).toEqual({
    kind: 'unavailable',
  })
})
