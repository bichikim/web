/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

vi.mock('../../privacy-policy/LocalAndRetentionSections', () => ({
  LocalAndRetentionSections: () => <div />,
}))
vi.mock('../../privacy-policy/SharingAndProcessingSections', () => ({
  SharingAndProcessingSections: () => <div />,
}))
vi.mock('../../privacy-policy/PolicyNavigation', () => ({
  PolicyNavigation: () => <nav />,
}))

import {PPrivacyPolicy} from '../PPrivacyPolicy'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should replace only the account details for Apps in Toss', () => {
  render(() => <PPrivacyPolicy platform="apps-in-toss" />)

  expect(screen.getByRole('heading', {name: '앱인토스 계정'})).toBeTruthy()
  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/app-in-toss/terms',
  )
  expect(screen.getByText(/앱별 사용자 식별값\(userKey\)/u)).toBeTruthy()
  expect(screen.getByText(/웹 계정과 앱인토스 계정은 별도로 관리/u)).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '웹 계정'})).toBeNull()
})
