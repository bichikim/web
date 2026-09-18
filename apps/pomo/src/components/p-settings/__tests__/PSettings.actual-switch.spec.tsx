/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {onCleanup} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import {useFullscreen} from 'src/features/fullscreen'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {PSettings} from '../PSettings'

vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/components/p-radio-switch/PRadioSwitch', () => ({PRadioSwitch: () => null}))
vi.mock('src/components/p-select/PSelect', () => ({PSelect: () => null}))
vi.mock('src/components/p-weather-settings/PWeatherSettings', () => ({
  PWeatherSettings: () => null,
}))
vi.mock('src/components/p-dialogue-settings/PDialogueSettings', () => ({
  PDialogueSettings: () => null,
}))
vi.mock('src/components/p-credits-settings/PCreditsSettings', () => ({
  PCreditsSettings: () => null,
}))
vi.mock('src/components/p-feed-settings/PFeedSettings', () => ({PFeedSettings: () => null}))
vi.mock('src/components/p-guide-settings/PGuideSettings', () => ({PGuideSettings: () => null}))
vi.mock('src/features/fullscreen', () => ({useFullscreen: vi.fn()}))
vi.mock('src/features/display-theme', () => ({
  useDisplayTheme: () => ({onPreferenceChange: vi.fn(), preference: () => 'system'}),
}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))
vi.mock('src/components/user-settings/UserSettings', () => ({UserSettings: () => null}))

class TestResizeObserver {
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
}

const getComputedStyle = globalThis.getComputedStyle.bind(globalThis)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const styles = getComputedStyle(element, pseudoElement)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <>
      {props.navigation}
      {props.children}
    </>
  ))
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'supported',
    errorMessage: () => null,
    isEnabled: () => true,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => null,
    isEnabled: () => true,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should bind the full-screen and wake-lock checked accessors through real switches', async () => {
  render(() => (
    <PSettings dialogueComposerVisible={false} onDialogueComposerVisibleChange={vi.fn()} />
  ))

  expect(await screen.findByRole('switch', {name: '전체 화면'})).toBeChecked()
  expect(screen.getByRole('switch', {name: '화면 자동 꺼짐 방지'})).toBeChecked()
  expect(screen.getByRole('switch', {name: '대화 입력 버튼 표시'})).not.toBeChecked()
})

it('should keep the wake-lock controller mounted across settings tab changes', async () => {
  const cleanup = vi.fn()
  vi.mocked(useScreenWakeLock).mockImplementation(() => {
    onCleanup(cleanup)

    return {
      availability: () => 'supported',
      errorMessage: () => null,
      isEnabled: () => true,
      isRequestPending: () => false,
      onEnabledChange: vi.fn(),
    }
  })
  const {unmount} = render(() => <PSettings />)

  expect(useScreenWakeLock).toHaveBeenCalledOnce()
  expect(await screen.findByRole('switch', {name: '화면 자동 꺼짐 방지'})).toBeChecked()
  const guideTab = screen.getByRole('tab', {name: '설명서'})
  fireEvent.click(guideTab)

  expect(guideTab).toHaveAttribute('aria-selected', 'true')
  await waitFor(() => {
    expect(screen.queryByRole('switch', {name: '화면 자동 꺼짐 방지'})).toBeNull()
  })
  expect(cleanup).not.toHaveBeenCalled()
  const generalTab = screen.getByRole('tab', {name: '일반'})
  fireEvent.click(generalTab)

  expect(generalTab).toHaveAttribute('aria-selected', 'true')
  expect(useScreenWakeLock).toHaveBeenCalledOnce()
  expect(screen.getByRole('switch', {name: '화면 자동 꺼짐 방지'})).toBeChecked()

  unmount()
  expect(cleanup).toHaveBeenCalledOnce()
})
