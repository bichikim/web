/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {Lunar} from '../Lunar'

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

it('should convert the selected solar new year date to the lunar new year', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date('2026-02-17T12:00:00Z'))
  localStorage.clear()
  render(() => <Lunar />)
  await waitFor(() => expect(screen.getByRole('button', {name: /변환 방향/u})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: '양력 날짜: 날짜 선택'}))
  fireEvent.click(screen.getByRole('button', {name: '2026-02-17'}))
  expect(screen.getByText('2026년 1월 1일')).toBeVisible()
})

it('should restore lunar-to-solar direction and reject a nonexistent leap month', async () => {
  localStorage.setItem('pomo:tool-lunar-direction:v1', '"lunar"')
  render(() => <Lunar />)
  expect(await screen.findByText('2026-02-17')).toBeVisible()
  fireEvent.click(screen.getByRole('switch', {name: '윤달'}))
  expect(screen.getByText('존재하지 않는 날짜·윤달이거나 지원 범위를 벗어났습니다.')).toBeVisible()
  expect(screen.queryByRole('button', {name: '결과 복사'})).not.toBeInTheDocument()
})
