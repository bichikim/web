/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PModal} from 'src/components/p-modal/PModal'
import {PRadioSwitch} from 'src/components/p-radio-switch/PRadioSwitch'
import {PSelect} from 'src/components/p-select/PSelect'
import {PSwitch} from 'src/components/p-switch/PSwitch'
import {useDisplayTheme} from 'src/features/display-theme'
import {useFullscreen} from 'src/hooks/use-fullscreen'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {LEGACY_WEATHER_LOCATIONS} from 'src/features/weather'
import {PDialogueSettings} from '../../p-dialogue-settings/PDialogueSettings'
import {PHealthCheck} from '../../p-health-check/PHealthCheck'
import {PSettings} from '../PSettings'
import {PWeatherSettings} from '../../p-weather-settings/PWeatherSettings'
import {configureMocks} from './fixtures/configure-mocks'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/components/p-radio-switch/PRadioSwitch', () => ({PRadioSwitch: vi.fn()}))
vi.mock('src/components/p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/components/p-switch/PSwitch', () => ({PSwitch: vi.fn()}))
vi.mock('src/hooks/use-fullscreen', () => ({useFullscreen: vi.fn()}))
vi.mock('src/features/display-theme', () => ({useDisplayTheme: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('../../p-credits-settings/PCreditsSettings', () => ({PCreditsSettings: vi.fn()}))
vi.mock('../../p-dialogue-settings/PDialogueSettings', () => ({PDialogueSettings: vi.fn()}))
vi.mock('../../p-feed-settings/PFeedSettings', () => ({PFeedSettings: vi.fn()}))
vi.mock('../../p-health-check/PHealthCheck', () => ({PHealthCheck: vi.fn()}))
vi.mock('../../p-weather-settings/PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))
vi.mock('../../user-settings/UserSettings', () => ({UserSettings: vi.fn()}))

interface TabsRootProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly value?: string
}

let tabsRootProps: TabsRootProps | undefined

beforeEach(() => {
  vi.clearAllMocks()
  tabsRootProps = undefined
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
    List: (props: {children: JSX.Element}) => <>{props.children}</>,
    Trigger: (props: {children: JSX.Element}) => (
      <button role="tab" type="button">
        {props.children}
      </button>
    ),
  })
  vi.mocked(Tabs).mockImplementation((props: TabsRootProps) => {
    tabsRootProps = props
    return <>{props.children}</>
  })
  configureMocks({
    LEGACY_WEATHER_LOCATIONS,
    PDialogueSettings,
    PHealthCheck,
    PModal,
    PRadioSwitch,
    PSelect,
    PSwitch,
    PWeatherSettings,
    useDisplayTheme,
    useFullscreen,
    useScreenWakeLock,
  })
})

it('should expose the guide and credits as the final settings tabs', async () => {
  render(() => <PSettings />)

  expect(screen.queryByRole('button', {name: 'Pomofi 설명서'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '설정'}))
  fireEvent.click(screen.getByRole('button', {name: '포커스 복원'}))

  expect(screen.getByRole('dialog', {name: 'Pomofi 설정'}).hasAttribute('hidden')).toBe(false)
  expect(tabsRootProps?.class).toBe('contents')
  expect(tabsRootProps?.value).toBe('general')
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '일반',
    '배경',
    '이벤트',
    '피드',
    '대화',
    'AI',
    '사용자',
    '설명서',
    '크레딧',
  ])
  expect(screen.queryByRole('tab', {name: '날씨'})).toBeNull()
})

it('should keep the settings icon at its explicit toolbar size', () => {
  render(() => <PSettings />)
  const icon = screen.getByRole('button', {name: '설정'}).querySelector('span[aria-hidden="true"]')
  expect(icon).toHaveClass('size-6!')
})
