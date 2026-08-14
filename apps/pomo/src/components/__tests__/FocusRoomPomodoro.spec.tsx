/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {FocusRoomModal, type FocusRoomModalProps} from '../../design-system/FocusRoomModal'
import type {FocusRoomSwitchProps} from '../../design-system/FocusRoomSwitch'
import {FocusRoomPomodoro} from '../FocusRoomPomodoro'

const bridgeStorageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-bridge', () => ({
  Storage: bridgeStorageMocks,
}))
vi.mock('../../design-system/FocusRoomModal', () => ({
  FocusRoomModal: vi.fn(),
}))
vi.mock('../../design-system/FocusRoomSwitch', () => ({
  FocusRoomSwitch: (props: FocusRoomSwitchProps) => (
    <label>
      {props.label}
      <input
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
        role="switch"
        type="checkbox"
      />
    </label>
  ),
}))

describe('FocusRoomPomodoro', () => {
  beforeEach(() => {
    localStorage.clear()
    bridgeStorageMocks.getItem.mockReset()
    bridgeStorageMocks.setItem.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-13T00:00:00.000Z'))
    vi.mocked(FocusRoomModal).mockImplementation((props: FocusRoomModalProps) => {
      return (
        <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
          <p>{props.description}</p>
          {props.children}
          <button onClick={() => props.getInitialFocus?.()?.focus()} type="button">
            최초 포커스 적용
          </button>
          <button onClick={() => props.onOpenChange(false)} type="button">
            닫기
          </button>
        </div>
      )
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should expose the timer state and primary controls through an accessible dialog', async () => {
    const onPresentationChange = vi.fn()
    render(() => <FocusRoomPomodoro onPresentationChange={onPresentationChange} />)
    await vi.advanceTimersByTimeAsync(0)

    expect(onPresentationChange).toHaveBeenLastCalledWith({
      phaseLabel: '집중',
      statusLabel: '집중 준비',
      timeLabel: '25:00',
    })

    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    const timeTrigger = within(quickControls).getByRole('button', {
      name: '포모도로 열기, 집중 준비, 25:00',
    })
    expect(quickControls.querySelector('.focus-room-pomodoro__trigger-status')).toBeNull()
    const characterEmotion = quickControls.querySelector('.focus-room-character-emotion')
    const actionIndicator = quickControls.querySelector('.focus-room-pomodoro__action-indicator')
    expect(characterEmotion?.getAttribute('data-emotion')).toBe('focus')
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
    expect(actionIndicator?.querySelector('.i-tabler-player-play')).toBeInstanceOf(HTMLElement)

    fireEvent.click(within(quickControls).getByRole('button', {name: '집중 시작'}))
    expect(within(quickControls).getByRole('button', {name: '일시정지'})).toBeDefined()
    expect(characterEmotion?.getAttribute('data-active')).toBe('')
    expect(actionIndicator?.querySelector('.i-tabler-player-pause')).toBeInstanceOf(HTMLElement)

    fireEvent.click(within(quickControls).getByRole('button', {name: '일시정지'}))
    expect(within(quickControls).getByRole('button', {name: '계속하기'})).toBeDefined()
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
    expect(actionIndicator?.querySelector('.i-tabler-player-play')).toBeInstanceOf(HTMLElement)

    fireEvent.click(timeTrigger)

    const dialog = screen.getByRole('dialog', {name: '포모도로'})
    expect(dialog.hidden).toBe(false)
    expect(screen.getByRole('switch', {name: '집중·휴식 자동 재생'})).toHaveProperty(
      'checked',
      false,
    )
    fireEvent.click(screen.getByRole('button', {name: '최초 포커스 적용'}))
    expect(document.activeElement).toBe(within(dialog).getByRole('button', {name: '계속하기'}))
    expect(screen.queryByText('집중 1/4 · 25분')).toBeNull()
    expect(screen.getByLabelText('4회 중 0회 집중 완료')).toBeDefined()

    fireEvent.click(within(dialog).getByRole('button', {name: '계속하기'}))
    expect(within(dialog).getByRole('button', {name: '일시정지'})).toBeDefined()
    expect(screen.getByRole('button', {name: '현재 세션 종료'})).toBeDefined()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 집중 중, 25:00'}),
    ).toBeDefined()
    expect(characterEmotion?.getAttribute('data-active')).toBe('')

    vi.advanceTimersByTime(1_000)
    expect(within(dialog).getByText('24:59')).toBeDefined()
    expect(onPresentationChange).toHaveBeenLastCalledWith({
      phaseLabel: '집중',
      statusLabel: '집중 중',
      timeLabel: '24:59',
    })

    fireEvent.click(within(dialog).getByRole('button', {name: '일시정지'}))
    expect(within(dialog).getByRole('button', {name: '계속하기'})).toBeDefined()
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)

    fireEvent.click(screen.getByRole('button', {name: '현재 세션 종료'}))
    expect(within(dialog).getByRole('button', {name: '집중 시작'})).toBeDefined()
    expect(screen.queryByRole('button', {name: '현재 세션 종료'})).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '다음 단계로 이동'}))
    expect(within(dialog).getByRole('button', {name: '휴식 시작'})).toBeDefined()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 준비, 05:00'}),
    ).toBeDefined()
    expect(characterEmotion?.getAttribute('data-emotion')).toBe('rest')
    expect(screen.getByRole('button', {name: '세션 초기화'})).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: /4세션/}))
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeNull()
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 횟수(회)'}), {
      target: {value: '6'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 시간(분)'}), {
      target: {value: '30'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'}), {
      target: {value: '7'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'}), {
      target: {value: '20'},
    })
    fireEvent.click(screen.getByRole('button', {name: '설정 저장'}))
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeDefined()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 준비, 07:00'}),
    ).toBeDefined()
    expect(screen.getByRole('button', {name: /6세션 · 집중 30분/})).toBeDefined()
    expect(screen.getByLabelText('6회 중 1회 집중 완료')).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: /6세션/}))
    expect(screen.getByRole('button', {name: '취소'})).toBeDefined()
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    fireEvent.click(screen.getByRole('button', {name: '세션 초기화'}))
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 집중 준비, 30:00'}),
    ).toBeDefined()
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeDefined()
    expect(screen.getByLabelText('6회 중 0회 집중 완료')).toBeDefined()
    expect(screen.queryByRole('button', {name: '세션 초기화'})).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(dialog.hidden).toBe(true)
  })

  it('should continuously play focus and break phases when automatic playback is enabled', async () => {
    localStorage.setItem(
      'pomo:timer-config:v1',
      JSON.stringify({
        focusSeconds: 1,
        focusSessionsPerCycle: 2,
        longBreakSeconds: 1,
        shortBreakSeconds: 1,
      }),
    )
    render(() => <FocusRoomPomodoro />)
    await vi.advanceTimersByTimeAsync(0)

    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    fireEvent.click(
      within(quickControls).getByRole('button', {
        name: '포모도로 열기, 집중 준비, 00:01',
      }),
    )
    const dialog = screen.getByRole('dialog', {name: '포모도로'})
    const autoStartSwitch = screen.getByRole('switch', {name: '집중·휴식 자동 재생'})
    fireEvent.click(autoStartSwitch)
    expect(autoStartSwitch).toHaveProperty('checked', true)
    expect(localStorage.getItem('pomo:timer-auto-start:v1')).toBe('true')

    fireEvent.click(within(dialog).getByRole('button', {name: '집중 시작'}))
    vi.advanceTimersByTime(1_000)
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 중, 00:01'}),
    ).toBeDefined()

    vi.advanceTimersByTime(1_000)
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 집중 중, 00:01'}),
    ).toBeDefined()
  })

  it('should report focus and break lifecycle events without replaying starts on resume', async () => {
    const onEvents = vi.fn()
    render(() => <FocusRoomPomodoro onEvents={onEvents} />)
    await vi.advanceTimersByTimeAsync(0)

    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    fireEvent.click(within(quickControls).getByRole('button', {name: '집중 시작'}))
    expect(onEvents).toHaveBeenLastCalledWith(['focus-start'])

    fireEvent.click(within(quickControls).getByRole('button', {name: '일시정지'}))
    fireEvent.click(within(quickControls).getByRole('button', {name: '계속하기'}))
    expect(onEvents).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', {name: '포모도로 열기, 집중 중, 25:00'}))
    const dialog = screen.getByRole('dialog', {name: '포모도로'})
    fireEvent.click(within(dialog).getByRole('button', {name: '현재 세션 종료'}))
    expect(onEvents).toHaveBeenLastCalledWith(['focus-end'])

    fireEvent.click(within(dialog).getByRole('button', {name: '다음 단계로 이동'}))
    fireEvent.click(within(dialog).getByRole('button', {name: '휴식 시작'}))
    expect(onEvents).toHaveBeenLastCalledWith(['break-start'])

    fireEvent.click(within(dialog).getByRole('button', {name: '현재 세션 종료'}))
    expect(onEvents).toHaveBeenLastCalledWith(['break-end'])
  })

  it('should restore automatic playback after the app view is remounted', async () => {
    const firstView = render(() => <FocusRoomPomodoro />)
    const firstQuickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    fireEvent.click(
      within(firstQuickControls).getByRole('button', {
        name: '포모도로 열기, 집중 준비, 25:00',
      }),
    )
    fireEvent.click(screen.getByRole('switch', {name: '집중·휴식 자동 재생'}))
    firstView.unmount()

    render(() => <FocusRoomPomodoro />)
    await vi.advanceTimersByTimeAsync(0)
    const restoredQuickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    fireEvent.click(
      within(restoredQuickControls).getByRole('button', {
        name: '포모도로 열기, 집중 준비, 25:00',
      }),
    )
    const restoredSwitch = screen.getByRole('switch', {name: '집중·휴식 자동 재생'})

    expect(restoredSwitch).toHaveProperty('checked', true)
  })

  it('should wait for the native preference before restoring an elapsed timer', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:timer-config:v1',
      JSON.stringify({
        focusSeconds: 1,
        focusSessionsPerCycle: 2,
        longBreakSeconds: 1,
        shortBreakSeconds: 1,
      }),
    )
    localStorage.setItem(
      'pomo:timer:v1',
      JSON.stringify({
        completedFocusSessions: 0,
        endsAt: Date.now() + 1_000,
        phase: 'focus',
        status: 'running',
      }),
    )
    let resolvePreference: (value: string | null) => void = () => undefined
    bridgeStorageMocks.getItem.mockReturnValue(
      new Promise((resolve) => {
        resolvePreference = resolve
      }),
    )

    const onEvents = vi.fn()
    render(() => <FocusRoomPomodoro onEvents={onEvents} />)
    vi.advanceTimersByTime(1_500)
    resolvePreference('true')
    await vi.advanceTimersByTimeAsync(250)

    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenCalledWith(['focus-end', 'break-start'])
  })
})
