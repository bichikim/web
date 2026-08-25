import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  assertBodySize: vi.fn(),
  requireContentType: vi.fn(),
}))

vi.mock('h3', () => ({
  assertBodySize: mocks.assertBodySize,
  HTTPError: {
    isError: (error: unknown) => typeof error === 'object' && error !== null && 'status' in error,
  },
  requireContentType: mocks.requireContentType,
}))

import {readBoundedRequest, readJsonBody} from '../body'

const createEvent = (request: Request) => ({nativeEvent: {req: request}}) as never
const createHttpError = (status: number): Error & {readonly status: number} =>
  Object.assign(new Error(`HTTP ${status}`), {status})

beforeEach(() => {
  vi.clearAllMocks()
})

it.each([400, 422] as const)('should preserve the JSON HTTP %s status', async (status) => {
  mocks.requireContentType.mockImplementationOnce(() => {
    throw createHttpError(status)
  })

  await expect(readJsonBody(createEvent(new Request('https://example.com')), 1)).resolves.toEqual({
    status,
    success: false,
  })
})

it('should rethrow unsupported HTTP and unexpected JSON failures', async () => {
  const request = new Request('https://example.com', {body: '{}', method: 'POST'})
  Object.defineProperty(request, 'json', {
    configurable: true,
    value: async () => Promise.reject(createHttpError(401)),
  })
  await expect(readJsonBody(createEvent(request), 128)).rejects.toMatchObject({status: 401})

  mocks.assertBodySize.mockImplementationOnce(() => {
    throw new Error('unexpected')
  })
  await expect(readJsonBody(createEvent(request), 128)).rejects.toThrow('unexpected')
})

it('should preserve bad bounded requests and rethrow unsupported failures', async () => {
  mocks.assertBodySize.mockImplementationOnce(() => {
    throw createHttpError(400)
  })
  await expect(
    readBoundedRequest(createEvent(new Request('https://example.com')), 1),
  ).resolves.toEqual({status: 400, success: false})

  mocks.assertBodySize.mockImplementationOnce(() => {
    throw createHttpError(401)
  })
  await expect(
    readBoundedRequest(createEvent(new Request('https://example.com')), 1),
  ).rejects.toMatchObject({status: 401})

  mocks.assertBodySize.mockImplementationOnce(() => {
    throw new Error('unexpected')
  })
  await expect(
    readBoundedRequest(createEvent(new Request('https://example.com')), 1),
  ).rejects.toThrow('unexpected')
})
