/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopMode, useDesktopSceneSettingsListener} from '../../../features/desktop-mode'
import {usePSceneStyle} from '../../../features/focus-room-animation'

import {usePDisplayPreferences} from '../../../features/focus-room-display-preferences'
import {PPomodoro} from '../../p-pomodoro/PPomodoro'
import {DesktopPomodoro} from '../Pomodoro'

vi.mock('../../../features/focus-room-display-preferences', () => ({
  usePDisplayPreferences: vi.fn(),
}))

vi.mock('@solidjs/meta', () => ({Title: (props: {readonly children?: unknown}) => props.children}))
vi.mock('../../../features/focus-room-animation', () => ({usePSceneStyle: vi.fn()}))

vi.mock('../../../features/desktop-mode', () => ({
  useDesktopMode: vi.fn(),
  useDesktopSceneSettingsListener: vi.fn(),
  useDesktopSurfaceSize: vi.fn(),
}))

vi.mock('../../p-pomodoro/PPomodoro', () => ({
  PPomodoro: vi.fn((props) => <div data-style={props.sceneStyle}>포모도로</div>),
}))

const onModeChange = vi.fn().mockResolvedValue(undefined)
let mode: 'desktop' | 'normal' = 'desktop'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.mocked(usePDisplayPreferences).mockReturnValue({
    dialogueComposerVisible: () => false,
    featureRequestVisible: () => true,
    isReady: () => true,
    memoryAssistVisible: () => true,
    onDialogueComposerVisibleChange: vi.fn(),
    onFeatureRequestVisibleChange: vi.fn(),
    onMemoryAssistVisibleChange: vi.fn(),
    onPlayerVisibleChange: vi.fn(),
    onPomodoroVisibleChange: vi.fn(),
    onToolsButtonVisibleChange: vi.fn(),
    onTourButtonVisibleChange: vi.fn(),
    playerVisible: () => true,
    pomodoroVisible: () => true,
    toolsButtonVisible: () => true,
    tourButtonVisible: () => true,
  })
  mode = 'desktop'
  vi.mocked(useDesktopMode).mockImplementation(() => ({
    error: () => null,
    isChanging: () => false,
    mode: () => mode,
    onModeChange,
  }))
  vi.mocked(usePSceneStyle).mockImplementation(() => {
    const [sceneStyle, onSceneStyleChange] = createSignal<'original' | 'scribble'>('original')
    return {isReady: () => true, onSceneStyleChange, sceneStyle}
  })
})

afterEach(() => {
  vi.useRealTimers()
  document.documentElement.style.removeProperty('background')
  document.body.style.removeProperty('background')
})
it('should synchronize scene style and hide a non-desktop surface', () => {
  const view = render(() => <DesktopPomodoro />)
  expect(screen.getByText('포모도로')).toHaveAttribute('data-style', 'original')
  expect(PPomodoro).toHaveBeenCalledOnce()
  expect(useDesktopSceneSettingsListener).toHaveBeenCalledOnce()
  view.unmount()
  mode = 'normal'
  render(() => <DesktopPomodoro />)
  expect(screen.queryByText('포모도로')).not.toBeInTheDocument()
})

it('should wait for preferences and honor restored visibility', () => {
  const [ready, setReady] = createSignal(false)
  const [visible, setVisible] = createSignal(true)
  const preferences = usePDisplayPreferences()
  vi.mocked(usePDisplayPreferences).mockReturnValue({
    ...preferences,
    isReady: ready,
    pomodoroVisible: visible,
  })
  render(() => <DesktopPomodoro />)
  expect(screen.queryByText('포모도로')).not.toBeInTheDocument()
  setVisible(false)
  setReady(true)
  expect(screen.queryByText('포모도로')).not.toBeInTheDocument()
  setVisible(true)
  expect(screen.getByText('포모도로')).toBeInTheDocument()
  setVisible(false)
  expect(screen.queryByText('포모도로')).not.toBeInTheDocument()
})
