/** @vitest-environment jsdom */
import {beforeEach, expect, it, vi} from 'vitest'

import {getTextDirection, setLocale} from '@paraglide/runtime'
import {reportClientError} from '../../client-error-reporter'
import {getInitialAppsInTossLocale} from '../bootstrap'
import {prepareAppsInTossLocale} from '..'

vi.mock('@paraglide/runtime', () => ({getTextDirection: vi.fn(), setLocale: vi.fn()}))
vi.mock('../../client-error-reporter', () => ({reportClientError: vi.fn()}))
vi.mock('../bootstrap', () => ({getInitialAppsInTossLocale: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  document.documentElement.lang = ''
  document.documentElement.dir = ''
})

it('should apply the resolved locale and document direction', async () => {
  vi.mocked(getInitialAppsInTossLocale).mockResolvedValue('en')
  vi.mocked(setLocale).mockResolvedValue(undefined)
  vi.mocked(getTextDirection).mockReturnValue('ltr')

  await prepareAppsInTossLocale(() => true)

  expect(setLocale).toHaveBeenCalledWith('en', {reload: false})
  expect(document.documentElement.lang).toBe('en')
  expect(document.documentElement.dir).toBe('ltr')
})

it('should report locale failures and return a failed result', () => {
  const error = new Error('locale unavailable')
  vi.mocked(getInitialAppsInTossLocale).mockRejectedValue(error)

  return expect(prepareAppsInTossLocale(() => true))
    .resolves.toEqual({status: 'failed'})
    .then(() => {
      expect(reportClientError).toHaveBeenCalledWith(error, {
        feature: 'apps-in-toss-locale',
        source: 'direct',
      })
    })
})
