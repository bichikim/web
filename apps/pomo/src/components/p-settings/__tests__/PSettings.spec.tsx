/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import {PRadioSwitch} from 'src/components/p-radio-switch/PRadioSwitch'
import {PSelect} from 'src/components/p-select/PSelect'
import {PSwitch} from 'src/components/p-switch/PSwitch'
import {useDisplayTheme} from 'src/features/display-theme'
import {useFullscreen} from 'src/features/fullscreen'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {LEGACY_WEATHER_LOCATIONS} from 'src/features/weather'
import {PDialogueSettings} from '../../p-dialogue-settings/PDialogueSettings'
import {PHealthCheck} from '../../p-health-check/PHealthCheck'
import {PSettings} from '../PSettings'
import {PWeatherSettings} from '../../p-weather-settings/PWeatherSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/components/p-radio-switch/PRadioSwitch', () => ({PRadioSwitch: vi.fn()}))
vi.mock('src/components/p-select/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/components/p-switch/PSwitch', () => ({PSwitch: vi.fn()}))
vi.mock('src/features/fullscreen', () => ({useFullscreen: vi.fn()}))
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
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
      <button onClick={props.onCloseAutoFocus} type="button">
        포커스 복원
      </button>
    </div>
  ))
  vi.mocked(PRadioSwitch).mockImplementation((props) => (
    <button
      data-scene-style={props.sceneStyle}
      data-value={props.value}
      onClick={() => props.onChange(props.options.at(-1)?.value ?? props.value)}
      type="button"
    >
      {props.label}
    </button>
  ))
  vi.mocked(PSelect).mockImplementation((props) => (
    <button
      data-value={props.value}
      onClick={() => {
        if (props.multiple === true) {
          props.onChange(props.value)
        } else {
          props.onChange(props.value)
        }
      }}
      type="button"
    >
      {props.label}
    </button>
  ))
  vi.mocked(PSwitch).mockImplementation((props) => {
    const checked =
      Object.getOwnPropertyDescriptor(props, 'checked')?.get?.call(props) ?? props.checked
    const className = props.class
    const disabled = props.disabled
    const description = props.description
    return (
      <button
        aria-disabled={disabled}
        aria-pressed={checked}
        class={className}
        data-description={description}
        onClick={() => props.onChange(!checked)}
        type="button"
      >
        {props.label}
      </button>
    )
  })
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useDisplayTheme).mockReturnValue({
    onPreferenceChange: vi.fn(),
    preference: () => 'system',
  })
  vi.mocked(PDialogueSettings).mockImplementation((props) => (
    <button onClick={props.onRequestClose} type="button">
      대화 닫기
    </button>
  ))
  vi.mocked(PHealthCheck).mockImplementation(() => <div>헬스 체크 진단</div>)
  vi.mocked(PWeatherSettings).mockImplementation((props) => (
    <button
      data-location={props.location?.id}
      data-scene-mode={props.sceneMode}
      onClick={() => {
        props.onLocationChange?.(LEGACY_WEATHER_LOCATIONS.seoul)
        props.onSceneModeChange?.('rain')
      }}
      type="button"
    >
      날씨 변경
    </button>
  ))
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
