import {expect, it} from 'vitest'
import {invalidJsonBodyResponse} from '../invalid-json-body-response'

it('should return a private schema-error response with caller cookies', async () => {
  const response = invalidJsonBodyResponse(
    {body: {}, success: true},
    {
      cookies: ['session=renewed; HttpOnly', 'other=value'],
      error: 'invalid_email',
    },
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({error: 'invalid_email'})
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Pragma')).toBe('no-cache')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.getSetCookie()).toEqual(['session=renewed; HttpOnly', 'other=value'])
})

it.each([400, 413, 415, 422] as const)(
  'should preserve body-reader failure status %s',
  async (status) => {
    const response = invalidJsonBodyResponse({status, success: false}, {error: 'invalid_request'})
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({error: 'invalid_request'})
    expect(response.headers.getSetCookie()).toEqual([])
  },
)
