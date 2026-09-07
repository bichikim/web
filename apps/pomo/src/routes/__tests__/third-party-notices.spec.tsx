/** @vitest-environment jsdom */

import {A} from '@solidjs/router'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import licenseData from '../../../public/licenses.json' with {type: 'json'}

import ThirdPartyNoticesPage from '../third-party-notices'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(licenseData))),
  )
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should show license groups, distribution conditions, and original sources', async () => {
  render(() => <ThirdPartyNoticesPage />)

  expect(await screen.findByRole('heading', {name: '제3자 라이선스 및 배포 고지'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '핵심 소프트웨어'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '공개 가중치 및 AI 모델'})).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '실험·준비 기능 및 외부 에셋'})).toBeNull()
  expect(screen.queryByText('Babylon.js')).toBeNull()
  expect(screen.queryByText('RobotExpressive')).toBeNull()
  expect(screen.queryByText('Ninomaru Teien')).toBeNull()
  expect(screen.getByRole('heading', {name: 'Apps in Toss Web Framework'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'SolidJS 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(screen.getByRole('link', {name: 'SolidStart 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'Kobalte 라이선스 원문 새 창에서 열기'}).getAttribute('href'),
  ).toBe('https://github.com/kobaltedev/kobalte/blob/main/LICENSE.md')
  expect(screen.getByText('토스 앱 로그인, 저장소, 안전 영역과 화면 켜짐 유지')).toBeTruthy()
  expect(
    screen.getByRole('heading', {name: 'PixiJS · UnoCSS · class-variance-authority'}),
  ).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'Dexie'})).toBeTruthy()
  expect(screen.getByText('로컬 대화 저장')).toBeTruthy()
  expect(screen.getByText('음악 플레이어 컨트롤')).toBeTruthy()
  expect(screen.getByRole('heading', {name: 'wLipSync'})).toBeTruthy()
  expect(screen.getByText('기기 안에서 재생 음성의 입모양 분석')).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'wLipSync 라이선스 원문 새 창에서 열기'}).getAttribute('href'),
  ).toBe('https://github.com/mrxz/wLipSync/blob/main/LICENSE')
  expect(screen.getByText('로그인과 PostgreSQL 연결')).toBeTruthy()
  expect(screen.getByText('서버 데이터베이스 스키마와 쿼리')).toBeTruthy()
  expect(screen.getByText('서버 응답 캐시 무효화')).toBeTruthy()
  expect(screen.getByText('서버의 오늘의 역사 콘텐츠 생성')).toBeTruthy()
  expect(screen.getByText('입력과 저장 데이터 검증')).toBeTruthy()
  expect(screen.getByText('Supertonic 3 Full · INT8')).toBeTruthy()
  expect(screen.getByText('OpenRAIL-M')).toBeTruthy()
  expect(screen.queryByText(/AI 생성 음성임을 표시합니다/u)).toBeNull()
  expect(screen.getByText(/라이선스 사본과 관련 고지를 제공합니다/u)).toBeTruthy()
  expect(screen.getByRole('link', {name: 'Supertonic 3 라이선스 원문 새 창에서 열기'})).toBeTruthy()
  expect(screen.getByText('브라우저 안에서 대화 초안 생성')).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'Gemma 4 라이선스 원문 새 창에서 열기'}).getAttribute('href'),
  ).toBe('https://ai.google.dev/gemma/apache_2')
  expect(screen.queryByRole('link', {name: '예제 코드 새 창에서 열기'})).toBeNull()
  expect(screen.queryByText('Qwen3.5 0.8B · 2B · 4B ONNX')).toBeNull()
  expect(screen.queryByText('Whisper Tiny · Base')).toBeNull()
  expect(screen.queryByText('Moonshine Tiny KO')).toBeNull()
  expect(screen.getByText(/원문 라이선스가 우선합니다/u)).toBeTruthy()
})

it('should report a license fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  render(() => <ThirdPartyNoticesPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('라이선스 정보를 불러오지 못했습니다.')
})
