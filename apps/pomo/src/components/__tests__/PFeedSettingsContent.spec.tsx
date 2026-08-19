/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PSelect} from 'src/design-system/PSelect'
import PFeedSettingsContent from '../PFeedSettingsContent'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('src/design-system/PSelect', () => ({PSelect: vi.fn()}))

const renderSettings = () => render(() => <PFeedSettingsContent />)

beforeEach(() => {
  localStorage.clear()
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(PSelect).mockImplementation((props) => (
    <label>
      {props.label}
      <select
        aria-label={`${props.label} ${props.accessibleLabel ?? ''}`.trim()}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </label>
  ))
})

it('should add, update, restore, and delete a feed connection with its voice', () => {
  const firstRender = renderSettings()
  const address = 'https://example.com/feed.xml'

  fireEvent.input(screen.getByRole('textbox', {name: '피드 주소'}), {
    target: {value: address},
  })
  fireEvent.click(screen.getByRole('button', {name: '추가'}))

  expect(screen.getByText(address)).toBeDefined()
  expect(screen.getByText('피드 주소를 저장했어요.')).toBeDefined()
  expect(screen.getByRole('option', {name: '기본값'})).toBeDefined()
  expect(localStorage.getItem('pomo:focus-room-feed-connections:v1')).toContain(
    '"voiceId":"default"',
  )

  fireEvent.change(screen.getByRole('combobox', {name: `음성 ${address} 피드 음성`}), {
    target: {value: 'M2'},
  })
  expect(screen.getByText('피드 음성을 변경했어요.')).toBeDefined()
  expect(localStorage.getItem('pomo:focus-room-feed-connections:v1')).toContain('"voiceId":"M2"')

  firstRender.unmount()
  renderSettings()

  expect(screen.getByText(address)).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: `${address} 피드 삭제`}))
  expect(screen.queryByText(address)).toBeNull()
  expect(localStorage.getItem('pomo:focus-room-feed-connections:v1')).toContain('"connections":[]')
})

it('should reject invalid and duplicate feed addresses', () => {
  renderSettings()
  const addressInput = screen.getByRole('textbox', {name: '피드 주소'})

  fireEvent.input(addressInput, {target: {value: 'not-a-feed-address'}})
  fireEvent.submit(addressInput.closest('form')!)
  expect(screen.getByText('HTTP 또는 HTTPS 피드 주소를 입력해 주세요.')).toBeDefined()

  fireEvent.input(addressInput, {target: {value: 'https://example.com/feed.xml'}})
  fireEvent.submit(addressInput.closest('form')!)
  fireEvent.input(addressInput, {target: {value: 'https://example.com/feed.xml'}})
  fireEvent.submit(addressInput.closest('form')!)

  expect(screen.getByText('이미 추가한 피드 주소예요.')).toBeDefined()
  expect(screen.getAllByText('https://example.com/feed.xml')).toHaveLength(1)
})

it('should replace an added recommendation with a stored feed item', () => {
  renderSettings()
  const recommendedAddress = new URL('/__dev/feeds/rss.xml', window.location.origin).href
  const historyAddress = new URL('/feeds/today-in-history/rss.xml', window.location.origin).href

  expect(screen.queryByText('아직 저장된 피드가 없어요. 피드 주소를 추가해 주세요.')).toBeNull()
  expect(screen.getByText('오늘의 역사')).toBeDefined()
  expect(screen.getByText('Pomo 5분 RSS')).toBeDefined()
  expect(screen.getByText('Pomo 5분 Atom')).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: '오늘의 역사 추천 피드 추가'}))

  expect(screen.queryByText('오늘의 역사')).toBeNull()
  expect(screen.getByText(historyAddress)).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'Pomo 5분 RSS 추천 피드 추가'}))

  expect(screen.queryByText('Pomo 5분 RSS')).toBeNull()
  expect(screen.getByText('Pomo 5분 Atom')).toBeDefined()
  expect(screen.getByText(recommendedAddress)).toBeDefined()
  expect(localStorage.getItem('pomo:focus-room-feed-connections:v1')).toContain(
    '"voiceId":"default"',
  )
})

it('should apply compact spacing to feed settings groups', () => {
  const result = renderSettings()
  const section = result.container.querySelector('.pomo-feed-settings') as HTMLElement
  const form = result.container.querySelector('.pomo-feed-settings__form') as HTMLElement
  const list = result.container.querySelector('.pomo-feed-settings__list') as HTMLElement

  expect(section.classList.contains('settings-compact:gap-4')).toBe(true)
  expect(form.classList.contains('settings-compact:gap-2')).toBe(true)
  expect(list.classList.contains('settings-compact:gap-2')).toBe(true)
  expect(list.classList.contains('settings-compact:[&_>_li]:gap-2')).toBe(true)
})
