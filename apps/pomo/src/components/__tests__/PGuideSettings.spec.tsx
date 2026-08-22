/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PGuideSettings} from '../PGuideSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))

beforeEach(() => {
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should explain the complete Pomofi experience inside the settings tab', () => {
  render(() => <PGuideSettings />)

  expect(screen.queryByText('Pomofi guide')).toBeNull()
  expect(screen.queryByRole('heading', {name: 'Pomofi 설명서'})).toBeNull()
  expect(screen.queryByText('장면 속 Pomo와 함께 집중하고 쉬는 방법을 알아보세요.')).toBeNull()
  expect(screen.getByText(/집중 25분과 짧은 휴식 5분/)).toBeDefined()
  expect(screen.getByText(/집중 4회를 마치면 긴 휴식 15분/)).toBeDefined()
  expect(screen.getByRole('heading', {name: '장면'})).toBeDefined()
  expect(screen.getByRole('heading', {name: '대화와 이벤트'})).toBeDefined()
  expect(screen.getByRole('heading', {name: '피드'})).toBeDefined()
  expect(screen.getByRole('heading', {name: '설정과 화면'})).toBeDefined()
})
