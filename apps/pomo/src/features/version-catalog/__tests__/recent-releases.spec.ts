import {expect, it} from 'vitest'

import type {VersionCatalog} from '../index'
import {selectRecentUnseenReleases} from '../recent-releases'

const catalog = {
  releases: [
    {
      changes: ['최신 변경'],
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

it('should select every unseen release from the last five client-clock days', () => {
  const releases = selectRecentUnseenReleases({
    catalog,
    now: new Date('2026-09-07T15:56:59.999Z'),
    viewedRelease: null,
  })

  expect(releases.map((release) => release.version)).toEqual(['2026. 09. 03 00:57'])
})

it('should exclude a release when exactly five days have passed across timezones', () => {
  const releases = selectRecentUnseenReleases({
    catalog,
    now: new Date('2026-09-07T15:57:00.000Z'),
    viewedRelease: null,
  })

  expect(releases).toEqual([])
})

it('should exclude future releases and releases at or before the viewed marker', () => {
  const releases = selectRecentUnseenReleases({
    catalog: {
      releases: [
        {
          changes: ['미래 변경'],
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

  expect(releases.map((release) => release.version)).toEqual(['2026. 09. 03 00:57'])
})

it('should order catalog entries by their absolute release time', () => {
  const releases = selectRecentUnseenReleases({
    catalog: {releases: [...catalog.releases].reverse()},
    now: new Date('2026-09-02T16:00:00.000Z'),
    viewedRelease: null,
  })

  expect(releases.map((release) => release.version)).toEqual([
    '2026. 09. 03 00:57',
    '2026. 09. 03 00:52',
  ])
})
