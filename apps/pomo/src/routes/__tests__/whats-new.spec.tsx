/** @vitest-environment jsdom */

import {A} from '@solidjs/router'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import catalog from '../../../public/versions/ko.json' with {type: 'json'}

import WhatsNewPage from '../whats-new'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(catalog))),
  )
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should show the newest changes and the first release from the public catalog', async () => {
  render(() => <WhatsNewPage />)

  expect(await screen.findByRole('heading', {name: '새로운 소식'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '업데이트'})).toBeTruthy()
  expect(screen.getByText('2026. 09. 03 00:57')).toBeTruthy()
  expect(
    screen.getByText('집중 공간의 캐릭터 움직임과 표정을 더 자연스럽게 다듬었습니다.'),
  ).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(13)
  expect(screen.getByRole('heading', {name: '첫 출시'})).toBeTruthy()
  expect(screen.getByText('2026. 08. 25 05:26')).toBeTruthy()
  expect(screen.getByRole('link', {name: '← Pomofi로 돌아가기'}).getAttribute('href')).toBe('/')
})

it('should report a catalog fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  render(() => <WhatsNewPage />)

  expect(await screen.findByRole('alert')).toHaveTextContent('업데이트 내역을 불러오지 못했습니다.')
})
