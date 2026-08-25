/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {PServicePolicyLinks} from '../PServicePolicyLinks'

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
    '/app-in-toss/terms',
  )
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/app-in-toss/privacy',
  )
  expect(screen.getByRole('link', {name: '환불 및 청약철회 정책'}).getAttribute('href')).toBe(
    '/refund-policy',
  )
})

it('should mark the current policy without linking to itself', () => {
  render(() => <PServicePolicyLinks currentPolicy="terms" platform="web" />)

  expect(screen.queryByRole('link', {name: '서비스 이용약관'})).toBeNull()
  expect(screen.getByText('서비스 이용약관').getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/web/privacy',
  )
})

it('should mark the Apps in Toss refund policy as current', () => {
  render(() => <PServicePolicyLinks currentPolicy="refund" platform="apps-in-toss" />)

  expect(screen.queryByRole('link', {name: '환불 및 청약철회 정책'})).toBeNull()
  expect(screen.getByText('환불 및 청약철회 정책').getAttribute('aria-current')).toBe('page')
})
