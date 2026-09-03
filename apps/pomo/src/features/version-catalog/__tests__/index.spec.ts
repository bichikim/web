import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale} from '@paraglide/runtime'

import {loadVersionCatalog} from '../index'

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const koreanCatalogJson = readFileSync(resolve(appDirectory, 'public/versions/ko.json'), 'utf8')
const englishCatalogJson = readFileSync(resolve(appDirectory, 'public/versions/en.json'), 'utf8')

vi.mock('solid-js/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js/web')>()

  return {...actual, getRequestEvent: vi.fn()}
})
vi.mock('@paraglide/runtime', () => ({getLocale: vi.fn()}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'false')
  vi.stubEnv('POMO_PUBLIC_ASSET_ORIGIN', 'https://www.pomofi.io')
  vi.mocked(getRequestEvent).mockReturnValue(undefined)
  vi.mocked(getLocale).mockReturnValue('ko')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('should fetch the catalog from the trusted public origin during SSR', async () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://www.pomofi.io/whats-new'),
  } as ReturnType<typeof getRequestEvent>)
  vi.mocked(fetch).mockResolvedValue(new Response(koreanCatalogJson))

  await loadVersionCatalog()

  expect(fetch).toHaveBeenCalledWith('https://www.pomofi.io/versions/ko.json')
})

it('should fetch and validate the Korean public version catalog', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(koreanCatalogJson))

  const catalog = await loadVersionCatalog()

  expect(fetch).toHaveBeenCalledWith('/versions/ko.json')
  expect(catalog.releases).toHaveLength(2)
  expect(catalog.releases[0]).toMatchObject({
    releasedAt: '2026-09-03T00:57:00+09:00',
    title: '업데이트',
    version: '2026. 09. 03 00:57',
  })
  expect(catalog.releases[0]?.changes).toHaveLength(13)
  expect(catalog.releases[1]).toEqual({
    changes: [],
    releasedAt: '2026-08-25T05:26:00+09:00',
    title: '첫 출시',
    version: '2026. 08. 25 05:26',
  })
})

it('should fetch the English catalog for the English locale', async () => {
  vi.mocked(getLocale).mockReturnValue('en')
  vi.mocked(fetch).mockResolvedValue(new Response(englishCatalogJson))

  const catalog = await loadVersionCatalog()

  expect(fetch).toHaveBeenCalledWith('/versions/en.json')
  expect(catalog.releases[0]).toMatchObject({title: 'Update'})
  expect(catalog.releases[0]?.changes[0]).toBe(
    'Character movement and expressions in the focus space now feel more natural.',
  )
  expect(catalog.releases[1]).toMatchObject({title: 'Initial release'})
})

it('should keep version and timezone data aligned across localized catalogs', () => {
  const koreanCatalog = JSON.parse(koreanCatalogJson) as {
    releases: ReadonlyArray<{releasedAt: string; version: string}>
  }
  const englishCatalog = JSON.parse(englishCatalogJson) as {
    releases: ReadonlyArray<{releasedAt: string; version: string}>
  }

  expect(englishCatalog.releases.map(({releasedAt, version}) => ({releasedAt, version}))).toEqual(
    koreanCatalog.releases.map(({releasedAt, version}) => ({releasedAt, version})),
  )
})

it('should report network failures', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  await expect(loadVersionCatalog()).rejects.toThrow('Failed to fetch version catalog.')
})

it('should report unsuccessful responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 503}))

  await expect(loadVersionCatalog()).rejects.toThrow('Failed to fetch version catalog: 503')
})

it('should report malformed JSON responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{'))

  await expect(loadVersionCatalog()).rejects.toThrow('Failed to parse version catalog.')
})

it('should reject JSON that does not satisfy the catalog contract', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{"releases":[]}'))

  await expect(loadVersionCatalog()).rejects.toThrow('Invalid version catalog.')
})

it('should reject a release timestamp without timezone information', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        releases: [
          {
            changes: [],
            releasedAt: '2026-09-03T00:57:00',
            title: '업데이트',
            version: '2026. 09. 03 00:57',
          },
        ],
      }),
    ),
  )

  await expect(loadVersionCatalog()).rejects.toThrow('Invalid version catalog.')
})

it('should reject a version that disagrees with its zoned release timestamp', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        releases: [
          {
            changes: [],
            releasedAt: '2026-09-03T00:57:00+09:00',
            title: '업데이트',
            version: '2026. 09. 03 00:58',
          },
        ],
      }),
    ),
  )

  await expect(loadVersionCatalog()).rejects.toThrow('Invalid version catalog.')
})
