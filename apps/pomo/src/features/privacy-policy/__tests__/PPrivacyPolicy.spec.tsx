/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PPrivacyPolicy} from 'src/features/privacy-policy'

it('should describe web account data and shared processing details', () => {
  render(() => <PPrivacyPolicy platform="web" />)

  expect(screen.getByRole('heading', {name: 'Pomofi 개인정보처리방침'})).toBeTruthy()
  expect(screen.queryByRole('link', {name: '개인정보처리방침'})).toBeNull()
  expect(screen.getByText('개인정보처리방침').getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', {name: '서비스 이용약관'}).getAttribute('href')).toBe(
    '/web/terms',
  )
  expect(screen.getByRole('heading', {name: '웹 계정'})).toBeTruthy()
  expect(screen.getByText(/Neon Auth 회원 식별값/u)).toBeTruthy()
  expect(
    screen.getByText(/대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지/u),
  ).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Neon, LLC'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Vercel Inc.'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Cloudflare, Inc.'})).toBeTruthy()
  expect(screen.getByText(/cdn\.jsdelivr\.net/u)).toBeTruthy()
  expect(screen.getByText(/Hugging Face, Inc\.\(미국\)/u)).toBeTruthy()
  expect(screen.getAllByText(/전화번호: 070-5236-4741/u)).toHaveLength(2)
  expect(screen.queryByRole('heading', {name: '앱인토스 계정'})).toBeNull()
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
