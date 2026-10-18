/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

import type {VersionCatalog} from '../index'
import {selectNoticeReleases} from '../recent-releases'

const catalog = {
  releases: [
    {
      changes: [{description: '최신 변경'}],
      releasedAt: '2026-09-03T00:57:00+09:00',
      title: '업데이트',
      version: '2026. 09. 03 00:57',
    },
    {
      changes: [],
      releasedAt: '2026-09-03T00:52:00+09:00',
      title: '첫 출시',
      version: '2026. 09. 03 00:52',
    },
  ],
} as const satisfies VersionCatalog

afterEach(() => {
  vi.restoreAllMocks()
})

it('should select every unseen release from the last five client-clock days', () => {
  const releases = selectNoticeReleases({
    catalog,
    now: new Date('2026-09-07T15:56:59.999Z'),
    viewedRelease: null,
  })

  expect(releases.map((release) => release.version)).toEqual(['2026. 09. 03 00:57'])
})

it('should exclude a release when exactly five days have passed across timezones', () => {
  const releases = selectNoticeReleases({
    catalog,
    now: new Date('2026-09-07T15:57:00.000Z'),
    viewedRelease: null,
  })

  expect(releases).toEqual([])
})

it('should include viewed recent releases when a newer release exists and exclude future releases', () => {
  const releases = selectNoticeReleases({
    catalog: {
      releases: [
        {
          changes: [{description: '미래 변경'}],
          releasedAt: '2026-09-03T01:00:00+09:00',
          title: '미래 업데이트',
          version: '2026. 09. 03 01:00',
        },
        ...catalog.releases,
      ],
    },
    now: new Date('2026-09-02T15:58:00.000Z'),
    viewedRelease: {
      formatVersion: 1,
      releasedAt: '2026-09-03T00:52:00+09:00',
      version: '2026. 09. 03 00:52',
    },
  })

  expect(releases.map((release) => release.version)).toEqual([
    '2026. 09. 03 00:57',
    '2026. 09. 03 00:52',
  ])
})

it('should order catalog entries by their absolute release time', () => {
  const releases = selectNoticeReleases({
    catalog: {releases: [...catalog.releases].reverse()},
    now: new Date('2026-09-02T16:00:00.000Z'),
    viewedRelease: null,
  })

  expect(releases.map((release) => release.version)).toEqual([
    '2026. 09. 03 00:57',
    '2026. 09. 03 00:52',
  ])
})

it('should preserve input order and release references for equal instants across timezones', () => {
  const first = Object.freeze({...catalog.releases[0], releasedAt: '2026-09-02T15:57:00Z'})
  const second = Object.freeze(catalog.releases[0])
  const older = Object.freeze(catalog.releases[1])
  const input = Object.freeze([older, first, second])

  const releases = selectNoticeReleases({
    catalog: {releases: input},
    now: new Date('2026-09-02T16:00:00Z'),
    viewedRelease: null,
  })

  expect(releases).toEqual([first, second, older])
  expect(releases[0]).toBe(first)
  expect(releases[1]).toBe(second)
  expect(releases[2]).toBe(older)
  expect(input).toEqual([older, first, second])
})

it('should compare viewed releases by instant even when their timestamp spelling differs', () => {
  expect(
    selectNoticeReleases({
      catalog,
      now: new Date('2026-09-02T16:00:00Z'),
      viewedRelease: {
        formatVersion: 1,
        releasedAt: '2026-09-02T15:57:00Z',
        version: catalog.releases[0].version,
      },
    }),
  ).toEqual([])
})

it('should return no notice for an empty catalog', () => {
  expect(
    selectNoticeReleases({
      catalog: {releases: []},
      now: new Date('2026-09-02T16:00:00Z'),
      viewedRelease: null,
    }),
  ).toEqual([])
})

it('should parse each catalog timestamp once while selecting and ordering a notice', () => {
  const old = {...catalog.releases[0], releasedAt: '2026-08-25T00:00:00Z'}
  const future = {...catalog.releases[0], releasedAt: '2026-09-03T00:00:00Z'}
  const input = [catalog.releases[1], future, catalog.releases[0], old]
  const parse = vi.spyOn(Date, 'parse')

  const releases = selectNoticeReleases({
    catalog: {releases: input},
    now: new Date('2026-09-02T16:00:00Z'),
    viewedRelease: null,
  })

  expect(releases).toEqual(catalog.releases)
  expect(parse.mock.calls.map(([timestamp]) => timestamp)).toEqual(
    input.map((release) => release.releasedAt),
  )
})

it('should skip ordering when every recent release has been viewed', () => {
  const sort = vi.spyOn(Array.prototype, 'sort')

  const releases = selectNoticeReleases({
    catalog: {releases: [...catalog.releases].reverse()},
    now: new Date('2026-09-02T16:00:00Z'),
    viewedRelease: {
      formatVersion: 1,
      releasedAt: catalog.releases[0].releasedAt,
      version: catalog.releases[0].version,
    },
  })
  const sortCount = sort.mock.calls.length
  sort.mockRestore()

  expect(releases).toEqual([])
  expect(sortCount).toBe(0)
})
