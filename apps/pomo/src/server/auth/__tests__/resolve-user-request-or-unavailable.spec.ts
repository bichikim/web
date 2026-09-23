import {afterEach, expect, it, vi} from 'vitest'
import {resolveUserRequest} from '../resolve-user-request'
import {UserRequestResolutionError} from '../user-request-resolution-error'
import {resolveUserRequestOrUnavailable} from '../resolve-user-request-or-unavailable'

vi.mock('../resolve-user-request', () => ({resolveUserRequest: vi.fn()}))

const request = new Request('https://example.com/api/calendar/events')
const options = {
  logMessage: 'Failed to resolve calendar user',
  unavailableError: 'calendar_unavailable',
}

afterEach(() => vi.restoreAllMocks())

it('should return the resolved identity on success', async () => {
  const identity = {access: 'user', cookies: [], userId: 'user-1'} satisfies Awaited<
    ReturnType<typeof resolveUserRequest>
  >
  vi.mocked(resolveUserRequest).mockResolvedValueOnce(identity)
  await expect(resolveUserRequestOrUnavailable(request, options)).resolves.toEqual({
    identity,
    kind: 'ok',
  })
})

it('should preserve cookies and hide resolution failures behind a private 503 response', async () => {
  const cause = new Error('database unavailable')
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(resolveUserRequest).mockRejectedValueOnce(
    new UserRequestResolutionError(['session=renewed; HttpOnly'], cause),
  )
  const result = await resolveUserRequestOrUnavailable(request, options)
  expect(result.kind).toBe('unavailable')
  if (result.kind !== 'unavailable') {
    return
  }
  expect(result.response.status).toBe(503)
  expect(result.response.headers.get('Set-Cookie')).toBe('session=renewed; HttpOnly')
  await expect(result.response.json()).resolves.toEqual({error: 'calendar_unavailable'})
  expect(log).toHaveBeenCalledWith(options.logMessage, cause)
})

it('should rethrow unrelated failures', async () => {
  const failure = new Error('unexpected')
  vi.mocked(resolveUserRequest).mockRejectedValueOnce(failure)
  await expect(resolveUserRequestOrUnavailable(request, options)).rejects.toBe(failure)
})
