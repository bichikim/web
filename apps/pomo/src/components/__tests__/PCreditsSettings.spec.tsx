/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import licenseData from '../../../public/licenses.json' with {type: 'json'}

import {PCreditsSettings} from '../PCreditsSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(licenseData))),
  )
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
  })
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should credit the creator and disclose current software and model licenses', async () => {
  render(() => <PCreditsSettings />)

  expect(screen.queryByText('Pomofi credits')).toBeNull()
  expect(screen.queryByRole('heading', {name: '크레딧'})).toBeNull()
  expect(screen.queryByText(/Pomofi를 만든 사람과 음악/u)).toBeNull()
  const creatorDetails = screen.getByText('Bichi Kim').closest('dl')
  expect(creatorDetails).not.toBeNull()
  expect(creatorDetails?.className).toContain('rounded-panel')
  expect(creatorDetails?.className).toContain('border')
  expect(screen.getByRole('heading', {name: '만든 사람'}).parentElement?.className).toContain(
    'pt-0',
  )
  expect(screen.getByRole('heading', {name: '음악'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Rainy Monday'})).toBeTruthy()
  expect(screen.getByText('Bichi Kim · 음악 제작')).toBeTruthy()
  expect(screen.queryByText('Pomofi에서 재생되는 음악을 만든 아티스트입니다.')).toBeNull()
  expect(screen.queryByText('프로젝트별 라이선스와 원문 링크입니다.')).toBeNull()
  expect(await screen.findByRole('heading', {name: '오픈소스 소프트웨어'})).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '주요 오픈소스 소프트웨어'})).toBeNull()
  expect(screen.getByRole('link', {name: 'SolidJS 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'SolidStart 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Apps in Toss Web Framework'})).toBeTruthy()
  expect(
    screen
      .getByRole('link', {
        name: 'Apps in Toss Web Framework 라이선스 원문 새 창에서 열기',
      })
      .getAttribute('href'),
  ).toBe('https://cdn.jsdelivr.net/npm/@apps-in-toss/web-framework@3.0.4/LICENSE')
  const openSourceCredit = screen
    .getByRole('heading', {name: 'PixiJS · UnoCSS · class-variance-authority'})
    .closest('li')
  expect(openSourceCredit).not.toBeNull()
  expect(openSourceCredit?.className).toContain('rounded-panel')
  expect(openSourceCredit?.className).toContain('border')
  expect(openSourceCredit?.querySelector('[data-pomo-tag]')).not.toBeNull()
  expect(screen.getByRole('heading', {name: 'media-chrome'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'wLipSync'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'wLipSync 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Dexie'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Neon Database'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Drizzle ORM'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Vercel Functions'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'OpenAI Node.js SDK'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Zod'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'Neon Auth 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'Neon Serverless 라이선스 원문 새 창에서 열기'}),
  ).toBeTruthy()
  expect(screen.queryByText(/빠르게 반응하는 UI와 서버 렌더링/u)).toBeNull()
  expect(screen.getByText('Supertonic 3')).toBeTruthy()
  expect(screen.getByText('OpenRAIL-M')).toBeTruthy()
  expect(screen.getByRole('link', {name: 'Supertonic 3 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'Gemma 4 라이선스 원문 새 창에서 열기'}).getAttribute('href'),
  ).toBe('https://ai.google.dev/gemma/apache_2')
  expect(screen.queryByRole('link', {name: '예제 코드 새 창에서 열기'})).toBeNull()
  expect(screen.queryByText(/대화 내용을 서버로 보내지 않고/u)).toBeNull()
  expect(screen.queryByText(/모델 라이선스의 용도 제한/u)).toBeNull()
  expect(screen.queryByText(/가중치가 공개된 모델을 함께 안내합니다/u)).toBeNull()
  expect(screen.queryByText(/서버 API 없이 브라우저에서 텍스트 생성/u)).toBeNull()
  expect(screen.queryByText('Qwen3.5 0.8B · 2B · 4B ONNX')).toBeNull()
  expect(screen.queryByText('Whisper Tiny · Base')).toBeNull()
  expect(screen.queryByText('Moonshine Tiny KO')).toBeNull()
  expect(screen.queryByText('RobotExpressive')).toBeNull()
  expect(screen.queryByText('Ninomaru Teien')).toBeNull()
  expect(screen.getByText(/이 화면은 요약이며 원문 라이선스를 대체하지 않습니다/u)).toBeTruthy()
  expect(screen.queryByText(/이해를 돕기 위한 요약/u)).toBeNull()
  expect(screen.getByRole('link', {name: '제3자 라이선스 관리 문서'}).getAttribute('href')).toBe(
    '/third-party-notices',
  )
})

it('should preserve static credits and report a license fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  render(() => <PCreditsSettings />)

  expect(screen.getByRole('heading', {name: '만든 사람'})).toBeTruthy()
  expect(await screen.findByRole('alert')).toHaveTextContent('라이선스 정보를 불러오지 못했어요.')
})
