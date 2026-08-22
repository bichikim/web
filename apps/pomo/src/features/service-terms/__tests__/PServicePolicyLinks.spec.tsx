/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PServicePolicyLinks} from 'src/features/service-terms'

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should link to the web policies by default', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '')
  render(() => <PServicePolicyLinks />)

  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/web/terms',
  )
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/web/privacy',
  )
  expect(screen.queryByRole('link', {name: '환불 및 청약철회 정책'})).toBeNull()
})

it('should link to the Apps in Toss policies in the app build', () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  render(() => <PServicePolicyLinks />)

  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/apps-in-toss/terms',
  )
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/apps-in-toss/privacy',
  )
  expect(screen.getByRole('link', {name: '환불 및 청약철회 정책'}).getAttribute('href')).toBe(
    '/refund-policy',
  )
})
