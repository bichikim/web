import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale} from '@paraglide/runtime'

import {loadVersionCatalog} from '../index'

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const koreanCatalogJson = readFileSync(resolve(appDirectory, 'public/versions/v2/ko.json'), 'utf8')
const englishCatalogJson = readFileSync(resolve(appDirectory, 'public/versions/v2/en.json'), 'utf8')

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

  expect(fetch).toHaveBeenCalledWith('https://www.pomofi.io/versions/v2/ko.json')
})

it('should fetch and validate the Korean public version catalog', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(koreanCatalogJson))

  const catalog = await loadVersionCatalog()

  expect(fetch).toHaveBeenCalledWith('/versions/v2/ko.json')
  expect(catalog.releases).toHaveLength(3)
  expect(catalog.releases[0]).toMatchObject({
    releasedAt: '2026-09-08T11:44:00+09:00',
    summary: '기억할 일부터 하루의 기록까지, Pomo에서 할 수 있는 일이 늘어났어요.',
    title: 'Pomo 업데이트 안내',
    version: '2026. 09. 08 11:44',
  })
  expect(catalog.releases[0]?.changes).toHaveLength(8)
  expect(catalog.releases[1]?.summary).toBeUndefined()
  expect(catalog.releases[1]?.changes).toHaveLength(13)
  expect(catalog.releases[2]).toEqual({
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

  expect(fetch).toHaveBeenCalledWith('/versions/v2/en.json')
  expect(catalog.releases[0]).toMatchObject({
    summary: 'From reminders to daily memories, there is more you can do with Pomo.',
    title: 'Pomo update',
  })
  expect(catalog.releases[0]?.changes[0]).toEqual({
    description:
      'Save things you want to remember and choose when to be notified. ' +
      'You can also set advance and repeat reminders.',
    title: 'Memos and reminders',
  })
  expect(catalog.releases[0]?.notes).toEqual([
    'Memo reminders and event alarms notify you through chat and voice while Pomo is open.',
  ])
  expect(catalog.releases[2]).toMatchObject({title: 'Initial release'})
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

it('should normalize legacy text changes without requiring summary or notes', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        releases: [
          {
            changes: ['기존 변경'],
            releasedAt: '2026-09-03T00:57:00+09:00',
            title: '업데이트',
            version: '2026. 09. 03 00:57',
          },
        ],
      }),
    ),
  )

  const catalog = await loadVersionCatalog()

  expect(catalog.releases[0]?.changes).toEqual([{description: '기존 변경'}])
  expect(catalog.releases[0]?.summary).toBeUndefined()
  expect(catalog.releases[0]?.notes).toBeUndefined()
})

it('should reject a structured change without a description', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        releases: [
          {
            changes: [{title: '제목만 있음'}],
            releasedAt: '2026-09-03T00:57:00+09:00',
            title: '업데이트',
            version: '2026. 09. 03 00:57',
          },
        ],
      }),
    ),
  )

  await expect(loadVersionCatalog()).rejects.toThrow('Invalid version catalog.')
})
