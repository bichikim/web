/** @vitest-environment jsdom */

import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getInitialAppsInTossLocale} from '../../features/apps-in-toss-locale/bootstrap'
import {reportClientError} from '../../features/client-error-reporter'
import {getTextDirection, setLocale} from '@paraglide/runtime'
import {AppsInTossHomePage} from '../AppsInTossHomePage'

vi.mock('../../features/apps-in-toss-locale/bootstrap', () => ({
  getInitialAppsInTossLocale: vi.fn(),
}))
vi.mock('../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))
vi.mock('@paraglide/runtime', () => ({getTextDirection: vi.fn(), setLocale: vi.fn()}))
vi.mock('../AppsInTossLoadingPage', () => ({
  AppsInTossLoadingPage: () => <p>loading page</p>,
}))
vi.mock('../PHomePage', () => ({PHomePage: () => <p>home page</p>}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTextDirection).mockReturnValue('ltr')
  vi.mocked(setLocale).mockResolvedValue(undefined)
  document.documentElement.lang = ''
  document.documentElement.dir = ''
})

afterEach(() => {
  cleanup()
})

it('should apply the host locale before showing the home page', async () => {
  vi.mocked(getInitialAppsInTossLocale).mockResolvedValue('ko')

  render(() => <AppsInTossHomePage />)

  expect(screen.getByText('loading page')).toBeDefined()
  await screen.findByText('home page')
  expect(setLocale).toHaveBeenCalledWith('ko', {reload: false})
  expect(document.documentElement.lang).toBe('ko')
  expect(document.documentElement.dir).toBe('ltr')
})

it('should report locale initialization failures and finish loading', async () => {
  const error = new Error('locale unavailable')
  vi.mocked(getInitialAppsInTossLocale).mockRejectedValue(error)

  render(() => <AppsInTossHomePage />)

  await screen.findByText('home page')
  expect(reportClientError).toHaveBeenCalledWith(error, {
    feature: 'apps-in-toss-locale',
    source: 'direct',
  })
})

it('should ignore a locale result that arrives after unmounting', async () => {
  let resolveLocale: ((locale: 'ko') => void) | undefined
  vi.mocked(getInitialAppsInTossLocale).mockReturnValue(
    new Promise((resolve) => {
      resolveLocale = resolve
    }),
  )
  const result = render(() => <AppsInTossHomePage />)

  result.unmount()
  resolveLocale?.('ko')
  await Promise.resolve()
  await Promise.resolve()

  expect(setLocale).not.toHaveBeenCalled()
})

it('should not update the document after locale activation is interrupted', async () => {
  let resolveSetLocale: (() => void) | undefined
  vi.mocked(getInitialAppsInTossLocale).mockResolvedValue('ko')
  vi.mocked(setLocale).mockReturnValue(
    new Promise((resolve) => {
      resolveSetLocale = resolve
    }),
  )
  const result = render(() => <AppsInTossHomePage />)
  await waitFor(() => expect(setLocale).toHaveBeenCalledOnce())

  result.unmount()
  resolveSetLocale?.()
  await Promise.resolve()
  await Promise.resolve()

  expect(getTextDirection).not.toHaveBeenCalled()
  expect(document.documentElement.lang).toBe('')
})
