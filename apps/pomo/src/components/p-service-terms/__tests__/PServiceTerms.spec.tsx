/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

import {PServiceTerms} from '../PServiceTerms'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should replace only the platform terms on the Apps in Toss page', () => {
  render(() => <PServiceTerms platform="apps-in-toss" />)

  expect(screen.getByRole('heading', {name: '제7조 AI 음성 기능'})).toBeTruthy()
  expect(screen.getByRole('link', {name: '개인정보처리방침'}).getAttribute('href')).toBe(
    '/app-in-toss/privacy',
  )
  expect(screen.getByText(/토스 앱 안의 미니앱 환경/u)).toBeTruthy()
  expect(screen.getByText(/곡 또는 앨범 단위의 음악 이용권/u)).toBeTruthy()
  expect(screen.getByText(/앱인토스용 서비스는 만 19세 이상만 이용할 수 있습니다/u)).toBeTruthy()
  expect(screen.queryByText(/만 14세 이상만 이용할 수 있습니다/u)).toBeNull()
  expect(screen.queryByText(/지원 브라우저에서 제공됩니다/u)).toBeNull()
  expect(screen.queryByText(/웹 서비스에서는 현재 유료 상품을 판매하지 않습니다/u)).toBeNull()
})

it('should preserve custom back link details with the shared button', () => {
  render(() => <PServiceTerms backHref="/dev" backLabel="실험실 목록" platform="web" />)

  const returnLink = screen.getByRole('link', {name: '실험실 목록'})
  expect(returnLink).toHaveAttribute('href', '/dev')
  expect(returnLink).toHaveClass('min-h-11', 'rounded-full')
})

it('should default policy navigation to the web platform', () => {
  render(() => <PServiceTerms />)

  expect(screen.getByRole('link', {name: '개인정보처리방침'})).toHaveAttribute(
    'href',
    '/web/privacy',
  )
})

it('should render the web terms in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => <PServiceTerms platform="web" />)

  expect(screen.getByRole('heading', {name: 'Pomofi terms of service'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: 'Article 7. AI voice features'})).toBeInTheDocument()
  expect(
    screen.getByText(/The web service is available only to people aged 14 or older/u),
  ).toBeInTheDocument()
  expect(screen.queryByText(/[가-힣]/u)).toBeNull()
})
