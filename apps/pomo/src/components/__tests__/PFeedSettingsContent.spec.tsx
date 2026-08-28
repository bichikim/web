/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PSelect} from 'src/components/PSelect'
import {PFeedContext, type PFeedController} from 'src/features/focus-room-feed'
import PFeedSettingsContent from '../feed-settings/Content'

vi.mock('@kobalte/core/tabs', () => ({Tabs: {Content: vi.fn()}}))
vi.mock('src/components/PSelect', () => ({PSelect: vi.fn()}))

const renderSettings = () => render(() => <PFeedSettingsContent />)

beforeEach(() => {
  localStorage.clear()
  vi.mocked(Tabs.Content).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(PSelect).mockImplementation((props) => {
    if (props.multiple === true) {
      return null
    }

    return (
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
    )
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should add, update, restore, and delete a feed connection with its voice', () => {
  const firstRender = renderSettings()
  const address = 'https://example.com/feed.xml'

  expect(screen.queryByRole('heading', {name: '구독 피드'})).toBeNull()
  expect(
    screen.queryByText('대화 탭의 공통 모델과 각 피드에 저장된 음성으로 새 글을 읽어 줘요.'),
  ).toBeNull()
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
  const historyAddress = new URL('/api/feeds/today-in-history/rss.xml', window.location.origin).href

  expect(screen.queryByText('아직 저장된 피드가 없어요. 피드 주소를 추가해 주세요.')).toBeNull()
  expect(screen.getByText('오늘의 역사')).toBeDefined()
  expect(screen.getByText('Pomofi 5분 RSS')).toBeDefined()
  expect(screen.getByText('Pomofi 5분 Atom')).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: '오늘의 역사 추천 피드 추가'}))

  expect(screen.queryByText('오늘의 역사')).toBeNull()
  expect(screen.getByText(historyAddress)).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'Pomofi 5분 RSS 추천 피드 추가'}))

  expect(screen.queryByText('Pomofi 5분 RSS')).toBeNull()
  expect(screen.getByText('Pomofi 5분 Atom')).toBeDefined()
  expect(screen.getByText(recommendedAddress)).toBeDefined()
  expect(localStorage.getItem('pomo:focus-room-feed-connections:v1')).toContain(
    '"voiceId":"default"',
  )
})

it.each(['POMO_IS_APPS_IN_TOSS', 'POMO_IS_DESKTOP'] as const)(
  'should use the public server origin for %s recommendations',
  (runtime) => {
    vi.stubEnv(runtime, '1')
    vi.stubEnv('POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
    renderSettings()
    const developmentAddress = new URL('/__dev/feeds/rss.xml', window.location.origin).href

    fireEvent.click(screen.getByRole('button', {name: '오늘의 역사 추천 피드 추가'}))
    fireEvent.click(screen.getByRole('button', {name: 'Pomofi 5분 RSS 추천 피드 추가'}))

    expect(
      screen.getByText('https://www.pomofi.io/api/feeds/today-in-history/rss.xml'),
    ).toBeDefined()
    expect(screen.getByText(developmentAddress)).toBeDefined()
  },
)

it('should omit development recommendations in production', () => {
  vi.stubEnv('DEV', false)

  renderSettings()

  expect(screen.getByText('오늘의 역사')).toBeDefined()
  expect(screen.queryByText('Pomofi 5분 RSS')).toBeNull()
  expect(screen.queryByText('Pomofi 5분 Atom')).toBeNull()
})

it('should render saved dialogues when a feed runtime is available', () => {
  const runtime = {
    dialogues: () => [],
    issues: () => [],
    syncNow: vi.fn().mockResolvedValue(undefined),
  } as unknown as PFeedController

  render(() => (
    <PFeedContext.Provider value={runtime}>
      <PFeedSettingsContent />
    </PFeedContext.Provider>
  ))

  expect(screen.getByRole('heading', {name: '피드 대화'})).toBeDefined()
  expect(
    screen.getByText('아직 완성된 피드 대화가 없어요. 새 항목을 확인하면 자동으로 만들어요.'),
  ).toBeDefined()
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
