/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {render, screen} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {PSettings} from '../PSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('src/components/PModal', () => ({
  PModal: (props: {readonly children: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('src/components/PRadioSwitch', () => ({PRadioSwitch: () => null}))
vi.mock('src/components/PSelect', () => ({PSelect: () => null}))
vi.mock('src/components/PWeatherSettings', () => ({PWeatherSettings: () => null}))
vi.mock('src/components/PDialogueSettings', () => ({PDialogueSettings: () => null}))
vi.mock('src/components/PCreditsSettings', () => ({PCreditsSettings: () => null}))
vi.mock('src/components/PFeedSettings', () => ({PFeedSettings: () => null}))
vi.mock('src/components/PGuideSettings', () => ({PGuideSettings: () => null}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('src/components/UserSettings', () => ({UserSettings: () => null}))

beforeEach(() => {
  vi.mocked(Tabs).mockImplementation((props) => <>{props.children}</>)
  Object.assign(Tabs, {Content: (props: {readonly children: JSX.Element}) => <>{props.children}</>})
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => true,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
})

it('should bind the wake-lock checked accessor through the real switch', () => {
  render(() => <PSettings />)

  expect(screen.getByRole('switch', {name: '화면 자동 꺼짐 방지'})).toBeChecked()
})
