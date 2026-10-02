/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {cookieName, setLocale} from '@paraglide/runtime'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PVersionNotice} from '../components/p-version-notice/PVersionNotice'

const versionMocks = vi.hoisted(() => ({
  load: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('src/features/version-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/version-catalog')>()
  return {
    ...actual,
    loadVersionCatalog: versionMocks.load,
    readViewedRelease: versionMocks.read,
    writeViewedRelease: versionMocks.write,
  }
})

const catalogFor = (locale: 'en' | 'ko') =>
  ({
    releases: [
      {
        changes: [{description: 'change'}],
        releasedAt: '2026-09-03T00:57:00+09:00',
        title: locale === 'ko' ? '한국어 공지' : 'English notice',
        version: '2026. 09. 03 00:57',
      },
    ],
  }) as const

beforeEach(() => {
  document.cookie = `${cookieName}=ko; path=/`
  vi.useFakeTimers({shouldAdvanceTime: true})
  vi.setSystemTime(new Date('2026-09-02T16:00:00.000Z'))
  versionMocks.load.mockImplementation(async () => catalogFor('ko'))
  versionMocks.read.mockResolvedValue(null)
  versionMocks.write.mockResolvedValue(undefined)
})
afterEach(() => {
  document.cookie = `${cookieName}=; path=/; max-age=0`
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should reload notice releases after setLocale without document reload', async () => {
  render(() => <PVersionNotice desktopDialog featureRequestVisible={false} />)

  await screen.findByRole('heading', {name: '한국어 공지'})

  versionMocks.load.mockImplementation(async () => catalogFor('en'))
  await setLocale('en', {reload: false})

  expect(screen.getByRole('heading', {name: 'English notice'})).toBeInTheDocument()
  expect(versionMocks.load).toHaveBeenCalledTimes(2)
})
