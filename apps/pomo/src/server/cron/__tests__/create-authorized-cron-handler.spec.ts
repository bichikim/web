import {afterEach, expect, it, vi} from 'vitest'
import {createAuthorizedCronHandler} from '../create-authorized-cron-handler'

const mocks = vi.hoisted(() => ({authorize: vi.fn()}))
vi.mock('../environment', () => ({isAuthorizedCronRequest: mocks.authorize}))
afterEach(() => vi.restoreAllMocks())

it('should log authorization exceptions and never run maintenance', async () => {
  const failure = new Error('configuration unavailable')
  mocks.authorize.mockImplementation(() => {
    throw failure
  })
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const run = vi.fn()
  const handler = createAuthorizedCronHandler({
    authorizeFailureLog: 'auth failed',
    run,
    runFailureLog: 'run failed',
    runFailureMessage: 'failed',
  })
  const response = await handler({request: new Request('https://example.com')})
  expect(response.status).toBe(401)
  expect(await response.text()).toBe('Unauthorized')
  expect(run).not.toHaveBeenCalled()
  expect(log).toHaveBeenCalledWith('auth failed', failure)
})

it('should keep serialization failure inside the operation failure boundary', async () => {
  mocks.authorize.mockReturnValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const handler = createAuthorizedCronHandler({
    authorizeFailureLog: 'auth failed',
    run: async () => 1n,
    runFailureLog: 'run failed',
    runFailureMessage: 'failed',
  })
  const response = await handler({request: new Request('https://example.com')})
  expect(response.status).toBe(500)
  expect(await response.text()).toBe('failed')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})
