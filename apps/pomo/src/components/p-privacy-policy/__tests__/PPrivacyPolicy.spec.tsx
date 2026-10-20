/** @vitest-environment jsdom */

import {render, screen, within} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

import {PPrivacyPolicy} from '../PPrivacyPolicy'
import type {PrivacyPolicyPlatform} from '../../privacy-policy/shared'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

const renderWebPolicy = () => render(() => <PPrivacyPolicy platform="web" />)

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

it('should default policy navigation to the web platform', () => {
  render(() => <PPrivacyPolicy />)

  expect(screen.getByRole('link', {name: '서비스 이용약관'})).toHaveAttribute('href', '/web/terms')
})

it('should render the web privacy policy in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => <PPrivacyPolicy platform="web" />)

  expect(screen.getByRole('heading', {name: 'Pomofi privacy policy'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: 'Web account'})).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {name: 'Rights of users and legal representatives'}),
  ).toBeInTheDocument()
  expect(screen.queryByText(/[가-힣]/u)).toBeNull()
})

it('should render the web privacy policy navigation', () => {
  renderWebPolicy()

  expect(screen.getByRole('heading', {name: 'Pomofi 개인정보처리방침'})).toBeTruthy()
  const returnLink = screen.getByRole('link', {name: '앱으로 돌아가기'})
  expect(returnLink).toHaveClass('min-h-11', 'rounded-full', 'text-base', 'text-foreground')
  expect(returnLink.parentElement?.lastElementChild).toBe(returnLink)
  expect(screen.queryByRole('link', {name: '개인정보처리방침'})).toBeNull()
  expect(screen.getByText('개인정보처리방침').getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/web/terms',
  )
})

it('should describe web account data and shared processing details', () => {
  renderWebPolicy()

  expect(screen.getByRole('heading', {name: '웹 계정'})).toBeTruthy()
  expect(screen.getByText(/Neon Auth 회원 식별값/u)).toBeTruthy()
  expect(
    screen.getByText(/대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지/u),
  ).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '앱인토스 계정'})).toBeNull()
})

it('should list web processing providers and contact details', () => {
  renderWebPolicy()

  expect(screen.getByRole('heading', {name: 'Neon, LLC'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Vercel Inc.'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Cloudflare, Inc.'})).toBeTruthy()
  expect(screen.getByText(/cdn\.jsdelivr\.net/u)).toBeTruthy()
  expect(screen.getByText(/Hugging Face, Inc\.\(미국\)/u)).toBeTruthy()
  expect(screen.getAllByText(/전화번호: 070-5236-4741/u)).toHaveLength(2)
})

it('should link every contents item to its document section', () => {
  renderWebPolicy()

  const navigation = screen.getByRole('navigation', {name: '개인정보처리방침 목차'})
  const links = within(navigation).getAllByRole('link')
  expect(links).toHaveLength(12)
  for (const link of links) {
    const href = link.getAttribute('href')
    expect(href).toMatch(/^#/u)
    const section = document.getElementById(href?.slice(1) ?? '')
    expect(section?.closest('article')).toBeInstanceOf(HTMLElement)
    expect(section?.querySelector('h2')).toBeInstanceOf(HTMLHeadingElement)
  }
})

it('should retain contents focus while platform and return details change', () => {
  const [platform, setPlatform] = createSignal<PrivacyPolicyPlatform>('web')
  const [backHref, setBackHref] = createSignal('/before')
  const [backLabel, setBackLabel] = createSignal('이전 화면')
  render(() => (
    <PPrivacyPolicy backHref={backHref()} backLabel={backLabel()} platform={platform()} />
  ))

  const navigation = screen.getByRole('navigation', {name: '개인정보처리방침 목차'})
  const link = within(navigation).getByRole('link', {name: '2. 처리 항목과 목적'})
  const heading = screen.getByRole('heading', {name: 'Pomofi 개인정보처리방침'})
  const returnLink = screen.getByRole('link', {name: '이전 화면'})
  link.focus()

  batch(() => {
    setPlatform('apps-in-toss')
    setBackHref('/after')
    setBackLabel('다음 화면')
  })

  expect(screen.getByRole('heading', {name: '앱인토스 계정'})).toBeInTheDocument()
  expect(screen.getByRole('link', {name: '서비스 이용약관'})).toHaveAttribute(
    'href',
    '/app-in-toss/terms',
  )
  expect(screen.getByRole('heading', {name: 'Pomofi 개인정보처리방침'})).toBe(heading)
  expect(screen.getByRole('navigation', {name: '개인정보처리방침 목차'})).toBe(navigation)
  expect(document.activeElement).toBe(link)
  expect(screen.getByRole('link', {name: '다음 화면'})).toBe(returnLink)
  expect(returnLink).toHaveAttribute('href', '/after')
})
