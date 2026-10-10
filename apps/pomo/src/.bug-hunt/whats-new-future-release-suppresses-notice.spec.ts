/** @vitest-environment node */

import {maxBy} from 'es-toolkit/array'
import {expect, it} from 'vitest'

import type {VersionCatalog, VersionRelease} from '../features/version-catalog'
import {selectNoticeReleases} from '../features/version-catalog/recent-releases'
import type {ViewedRelease} from '../features/version-catalog/viewed-release-storage'

const pastRelease: VersionRelease = {
  changes: [{description: '실제 출시 변경'}],
  releasedAt: '2026-10-08T10:00:00+09:00',
  title: '실제 업데이트',
  version: '2026. 10. 08 10:00',
}

const futureRelease: VersionRelease = {
  changes: [{description: '예정 변경'}],
  releasedAt: '2099-01-01T09:00:00+09:00',
  title: '예정 업데이트',
  version: '2099. 01. 01 09:00',
}

const catalog: VersionCatalog = {releases: [futureRelease, pastRelease]}

const writeViewedReleaseLikeWhatsNew = (loadedCatalog: VersionCatalog): ViewedRelease => {
  const newestRelease = maxBy(loadedCatalog.releases, (release) => Date.parse(release.releasedAt))
  if (newestRelease === undefined) {
    throw new Error('Expected at least one catalog release.')
  }

  return {
    formatVersion: 1,
    releasedAt: newestRelease.releasedAt,
    version: newestRelease.version,
  }
}

it('should keep showing gift notices for later real releases after visiting whats-new with a future catalog entry', () => {
  const now = new Date('2026-10-09T12:00:00+09:00')
  const laterRelease: VersionRelease = {
    changes: [{description: '출시 직후'}],
    releasedAt: '2026-10-10T09:00:00+09:00',
    title: '10월 10일 업데이트',
    version: '2026. 10. 10 09:00',
  }
  const catalogAfterVisit: VersionCatalog = {
    releases: [futureRelease, laterRelease, pastRelease],
  }
  const viewedRelease = writeViewedReleaseLikeWhatsNew(catalog)

  expect(
    selectNoticeReleases({catalog, now, viewedRelease: null}).map((release) => release.version),
  ).toEqual([pastRelease.version])

  const noticeAfterVisit = selectNoticeReleases({
    catalog: catalogAfterVisit,
    now: new Date('2026-10-10T12:00:00+09:00'),
    viewedRelease,
  })

  expect(noticeAfterVisit.map((release) => release.version)).toEqual([laterRelease.version])
})
