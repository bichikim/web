/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Lunar} from '../Lunar'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

const renderLunar = () =>
  render(() => (
    <PreferenceProvider>
      <Lunar />
    </PreferenceProvider>
  ))

describe('solar-to-lunar conversion', () => {
  beforeEach(async () => {
    vi.useFakeTimers({toFake: ['Date']})
    vi.setSystemTime(new Date('2026-02-17T12:00:00Z'))
    localStorage.clear()
    renderLunar()
    await waitFor(() => expect(screen.getByRole('button', {name: /변환 방향/u})).toBeEnabled())
    fireEvent.click(screen.getByRole('button', {name: '양력 날짜: 날짜 선택'}))
  })

  it('should convert the selected solar new year date to the lunar new year', () => {
    expect(screen.getByText('날짜를 선택해주세요.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name: '2026-02-17'}))
    expect(screen.getByText('2026년 1월 1일')).toBeVisible()
  })
})

it('should restore lunar-to-solar direction and reject a nonexistent leap month', async () => {
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
  renderLunar()
  expect(await screen.findByText('2026-02-17')).toBeVisible()
  fireEvent.click(screen.getByRole('switch', {name: '윤달'}))
  expect(screen.getByText('존재하지 않는 날짜·윤달이거나 지원 범위를 벗어났습니다.')).toBeVisible()
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
})
