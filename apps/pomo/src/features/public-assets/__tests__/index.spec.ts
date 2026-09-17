import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {z} from 'zod'

import {getPublicAssetUrl, loadPublicJson, type LoadPublicJsonOptions} from '../index'

vi.mock('solid-js/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js/web')>()

  return {...actual, getRequestEvent: vi.fn()}
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'false')
  vi.stubEnv('POMO_PUBLIC_ASSET_ORIGIN', 'https://www.pomofi.io')
  vi.mocked(getRequestEvent).mockReturnValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('should fetch and validate a public JSON asset', async () => {
  const schema = z.object({value: z.string()})
  vi.mocked(fetch).mockResolvedValue(Response.json({value: 'loaded'}))

  await expect(loadPublicJson('/catalog.json', schema)).resolves.toEqual({value: 'loaded'})

  expect(fetch).toHaveBeenCalledWith('/catalog.json')
})

it('should report a failed public JSON fetch', async () => {
  const schema = z.object({value: z.string()})
  const cause = new Error('offline')
  vi.mocked(fetch).mockRejectedValue(cause)

  await expect(loadPublicJson('/catalog.json', schema)).rejects.toMatchObject({
    cause,
    message: 'Failed to fetch public JSON asset: /catalog.json',
  })
})

it('should reject an invalid public JSON path before fetching', async () => {
  const schema = z.object({value: z.string()})

  await expect(loadPublicJson('//example.invalid/catalog.json', schema)).rejects.toThrow(
    'Invalid public asset path.',
  )

  expect(fetch).not.toHaveBeenCalled()
})

it('should report an unsuccessful public JSON response', async () => {
  const schema = z.object({value: z.string()})
  vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 503}))

  await expect(loadPublicJson('/catalog.json', schema)).rejects.toThrow(
    'Failed to fetch public JSON asset: 503',
  )
})

it('should report malformed public JSON with its parse cause', async () => {
  const schema = z.object({value: z.string()})
  const cause = new SyntaxError('malformed')
  const response = new Response()
  vi.spyOn(response, 'json').mockRejectedValue(cause)
  vi.mocked(fetch).mockResolvedValue(response)

  await expect(loadPublicJson('/catalog.json', schema)).rejects.toMatchObject({
    cause,
    message: 'Failed to parse public JSON asset: /catalog.json',
  })
})

it('should report public JSON that does not satisfy its schema with its validation cause', async () => {
  const schema = z.object({value: z.string()})
  vi.mocked(fetch).mockResolvedValue(Response.json({value: 1}))

  await expect(loadPublicJson('/catalog.json', schema)).rejects.toMatchObject({
    cause: expect.any(z.ZodError),
    message: 'Invalid public JSON asset: /catalog.json',
  })
})

it('should use custom public JSON failure messages', async () => {
  const schema = z.object({value: z.string()})
  const options = {
    formatFetchFailure: ({path, status}) =>
      status === undefined ? `Network failure: ${path}` : `HTTP failure: ${status}`,
    formatInvalid: ({path}) => `Schema failure: ${path}`,
    formatParseFailure: ({path}) => `Parse failure: ${path}`,
  } satisfies LoadPublicJsonOptions

  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  await expect(loadPublicJson('/catalog.json', schema, options)).rejects.toThrow(
    'Network failure: /catalog.json',
  )

  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, {status: 503}))
  await expect(loadPublicJson('/catalog.json', schema, options)).rejects.toThrow(
    'HTTP failure: 503',
  )

  vi.mocked(fetch).mockResolvedValueOnce(new Response('{'))
  await expect(loadPublicJson('/catalog.json', schema, options)).rejects.toThrow(
    'Parse failure: /catalog.json',
  )

  vi.mocked(fetch).mockResolvedValueOnce(Response.json({value: 1}))
  await expect(loadPublicJson('/catalog.json', schema, options)).rejects.toThrow(
    'Schema failure: /catalog.json',
  )
})

it('should use a public JSON parser as the validation contract', async () => {
  const parser = vi.fn((value: unknown) => {
    if (typeof value !== 'object' || value === null || !('value' in value)) {
      throw new Error('Invalid parsed value.')
    }

    return {value: String(value.value)}
  })
  vi.mocked(fetch).mockResolvedValue(Response.json({value: 42}))

  await expect(loadPublicJson('/catalog.json', parser)).resolves.toEqual({value: '42'})

  expect(parser).toHaveBeenCalledWith({value: 42})
})

it('should preserve public JSON parser failures', async () => {
  const schemaError = new Error('invalid value')
  const parser = () => {
    throw new Error('Invalid parsed value.', {cause: schemaError})
  }
  vi.mocked(fetch).mockResolvedValue(Response.json({value: 42}))

  await expect(loadPublicJson('/catalog.json', parser)).rejects.toMatchObject({
    cause: schemaError,
    message: 'Invalid parsed value.',
  })
})

it('should preserve a root-relative path in the browser', () => {
  expect(getPublicAssetUrl('/versions.json')).toBe('/versions.json')
})

it('should reject a browser public asset path that changes origin', () => {
  expect(() => getPublicAssetUrl('//example.invalid/versions.json')).toThrow(
    'Invalid public asset path.',
  )
  expect(() => getPublicAssetUrl('//public-assets.invalid/versions.json')).toThrow(
    'Invalid public asset path.',
  )
})

it('should use the matching trusted request origin during SSR', () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://www.pomofi.io/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('https://www.pomofi.io/versions.json')
})

it('should allow a local request origin when configured for local rendering', () => {
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'true')
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('http://localhost:3000/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('http://localhost:3000/versions.json')
})

it('should reject an untrusted request origin during SSR', () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://example.invalid/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('https://www.pomofi.io/versions.json')
})

it('should reject an SSR public asset path that changes origin', () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://www.pomofi.io/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(() => getPublicAssetUrl('/\\example.invalid/versions.json')).toThrow(
    'Invalid public asset path.',
  )
})
