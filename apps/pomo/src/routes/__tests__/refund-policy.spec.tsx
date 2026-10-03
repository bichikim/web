/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {afterEach, expect, it, vi} from 'vitest'

import RefundPolicyPage from 'src/routes/refund-policy'

vi.mock('@solidjs/router', () => ({
  A: (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}))

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should describe only the current Apps in Toss music purchase', () => {
  const {container} = render(() => <RefundPolicyPage />)
  const policyText = container.textContent ?? ''

  expect(container.querySelector('h1')?.textContent).toBe('Pomofi 환불 및 청약철회 정책')
  expect(policyText).toMatch(/곡 또는 앨범 단위의 음악 이용권을 1회 결제로 판매합니다/u)
  expect(policyText).toMatch(/음악 파일의 다운로드 기능을 제공하지 않으며/u)
  expect(policyText).toMatch(/Android 결제는 토스 앱의 환불 신청 절차/u)
  expect(policyText).toMatch(/iOS 결제의 환불 신청과 결정은 Apple/u)
  const links = [...container.querySelectorAll('a')]
  expect(links.some(({textContent}) => textContent?.trim() === '환불 및 청약철회 정책')).toBe(false)
  const currentPolicy = container.querySelector('[aria-current="page"]')
  expect(currentPolicy?.textContent?.trim()).toBe('환불 및 청약철회 정책')
  const privacyLink = container.querySelector('a[href="/app-in-toss/privacy"]')
  expect(privacyLink?.textContent?.trim()).toBe('개인정보처리방침')
  expect(policyText).not.toMatch(/실물 응원 굿즈/u)
  expect(policyText).not.toMatch(/주간·월간/u)
})

it('should render the refund policy in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => <RefundPolicyPage />)

  expect(
    screen.getByRole('heading', {name: 'Pomofi consumer refund and withdrawal policy'}),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: '1. Music access pass'})).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {name: '6. Evidence, disputes, and governing law'}),
  ).toBeInTheDocument()
  expect(screen.queryByText(/[가-힣]/u)).toBeNull()
})
