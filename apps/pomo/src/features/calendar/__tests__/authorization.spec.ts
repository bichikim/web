/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {apiJson} from '../../api-json'
import {readStoredAppSession} from '../../user-auth/app-session'
import {openURL} from '@apps-in-toss/web-framework'
import {authorizeCalendarConnection} from '../client'

vi.mock('../../api-json', () => ({apiJson: vi.fn(), apiJsonRequest: vi.fn()}))
vi.mock('../../user-auth/app-session', () => ({readStoredAppSession: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({openURL: vi.fn()}))

const authorizationUrl = 'https://accounts.example.com/consent?state=one'
const assign = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'false')
  vi.stubGlobal('location', {assign})
  vi.mocked(apiJson).mockResolvedValue({authorizationUrl})
  vi.mocked(openURL).mockResolvedValue()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should request provider consent with web credentials before navigating', async () => {
  const response = Promise.withResolvers<{authorizationUrl: string}>()
  vi.mocked(apiJson).mockReturnValueOnce(response.promise)
  const authorization = authorizeCalendarConnection('google')
  await vi.waitFor(() => expect(apiJson).toHaveBeenCalledOnce())
  expect(assign).not.toHaveBeenCalled()
  expect(apiJson).toHaveBeenCalledWith('calendar/connect/google', {
    credentials: 'include',
    method: 'POST',
    responseSchema: expect.any(Object),
  })
  response.resolve({authorizationUrl})
  await expect(authorization).resolves.toBeUndefined()
  expect(assign).toHaveBeenCalledExactlyOnceWith(authorizationUrl)
  expect(openURL).not.toHaveBeenCalled()
})

it('should use the app session and await native navigation in Apps in Toss', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  vi.mocked(readStoredAppSession).mockResolvedValue('token')
  const navigation = Promise.withResolvers<void>()
  vi.mocked(openURL).mockReturnValueOnce(navigation.promise)
  let completed = false
  const authorization = authorizeCalendarConnection('microsoft').then(() => {
    completed = true
  })
  await vi.waitFor(() => expect(openURL).toHaveBeenCalledOnce())
  expect(apiJson).toHaveBeenCalledWith('calendar/connect/microsoft', {
    headers: {Authorization: 'Bearer token'},
    method: 'POST',
    responseSchema: expect.any(Object),
  })
  expect(completed).toBe(false)
  expect(assign).not.toHaveBeenCalled()
  navigation.resolve()
  await authorization
  expect(completed).toBe(true)
})

it('should retain an authorization failure without navigating', async () => {
  const error = new Error('authorization unavailable')
  vi.mocked(apiJson).mockRejectedValueOnce(error)
  await expect(authorizeCalendarConnection('google')).rejects.toBe(error)
  expect(assign).not.toHaveBeenCalled()
  expect(openURL).not.toHaveBeenCalled()
})

it('should keep the URL schema at the API boundary', async () => {
  vi.mocked(apiJson).mockImplementationOnce(async (_path, options) =>
    options.responseSchema.parse({authorizationUrl: 'invalid'}),
  )
  await expect(authorizeCalendarConnection('google')).rejects.toThrow()
  expect(assign).not.toHaveBeenCalled()
})

it('should retain a synchronous browser navigation failure', async () => {
  const error = new Error('navigation blocked')
  assign.mockImplementationOnce(() => {
    throw error
  })
  await expect(authorizeCalendarConnection('google')).rejects.toBe(error)
})

it('should retain a native navigation rejection', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  vi.mocked(readStoredAppSession).mockResolvedValue(null)
  const error = new Error('bridge unavailable')
  vi.mocked(openURL).mockRejectedValueOnce(error)
  await expect(authorizeCalendarConnection('google')).rejects.toBe(error)
  expect(assign).not.toHaveBeenCalled()
})

it('should keep concurrent consent requests independent', async () => {
  const first = Promise.withResolvers<{authorizationUrl: string}>()
  const second = Promise.withResolvers<{authorizationUrl: string}>()
  vi.mocked(apiJson).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const one = authorizeCalendarConnection('google')
  const two = authorizeCalendarConnection('microsoft')
  await vi.waitFor(() => expect(apiJson).toHaveBeenCalledTimes(2))
  second.resolve({authorizationUrl: `${authorizationUrl}&request=second`})
  await two
  first.resolve({authorizationUrl: `${authorizationUrl}&request=first`})
  await one
  expect(assign.mock.calls).toEqual([
    [`${authorizationUrl}&request=second`],
    [`${authorizationUrl}&request=first`],
  ])
})
