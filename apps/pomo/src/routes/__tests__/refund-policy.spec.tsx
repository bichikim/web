/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import RefundPolicyPage from 'src/routes/refund-policy'

vi.mock('@solidjs/router', () => ({
  A: (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />,
}))

it('should describe only the current Apps in Toss music purchase', () => {
  render(() => <RefundPolicyPage />)

  expect(screen.getByRole('heading', {name: 'Pomofi 환불 및 청약철회 정책'})).toBeTruthy()
  expect(screen.getByText(/곡 또는 앨범 단위의 음악 이용권을 1회 결제로 판매합니다/u)).toBeTruthy()
  expect(screen.getByText(/음악 파일의 다운로드 기능을 제공하지 않으며/u)).toBeTruthy()
  expect(screen.getByText(/Android 결제는 토스 앱의 환불 신청 절차/u)).toBeTruthy()
  expect(screen.getByText(/iOS 결제의 환불 신청과 결정은 Apple/u)).toBeTruthy()
  expect(screen.queryByRole('link', {name: '환불 및 청약철회 정책'})).toBeNull()
  expect(screen.getByText('환불 및 청약철회 정책').getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/app-in-toss/privacy',
  )
  expect(screen.queryByText(/실물 응원 굿즈/u)).toBeNull()
  expect(screen.queryByText(/주간·월간/u)).toBeNull()
})
