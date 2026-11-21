/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {createTestBroadcastChannel} from 'src/__tests__/create-test-broadcast-channel'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import type {PSwitchProps} from 'src/components/p-switch/PSwitch'
import type {PomodoroTimerController, PomodoroTimerState} from 'src/features/pomodoro-timer'
import breakStatusIcon from '../../assets/pomodoro-status-icons/break.webp'
import focusStatusIcon from '../../assets/pomodoro-status-icons/focus.webp'
import scribbleBreakStatusIcon from '../../assets/pomodoro-status-icons/scribble/break.webp'
import scribbleFocusStatusIcon from '../../assets/pomodoro-status-icons/scribble/focus.webp'
import {PPomodoro} from '../PPomodoro'

const {PModal: RealPModal} = await vi.importActual<typeof import('src/components/p-modal/PModal')>(
  'src/components/p-modal/PModal',
)

const bridgeStorageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: bridgeStorageMocks,
}))
vi.mock('src/components/p-modal/PModal', () => ({
  PModal: vi.fn(),
}))
vi.mock('src/components/p-switch/PSwitch', () => ({
  PSwitch: (props: PSwitchProps) => {
    const initialChecked = props.checked

    return (
      <label class={props.class} data-initial-checked={initialChecked ? 'true' : 'false'}>
        {props.label}
        <span aria-hidden="true">{props.description}</span>
        <input
          checked={props.checked}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
          role="switch"
          type="checkbox"
        />
      </label>
    )
  },
}))

describe('PPomodoro', () => {
  beforeEach(() => {
    localStorage.clear()
    bridgeStorageMocks.getItem.mockReset()
    bridgeStorageMocks.setItem.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-13T00:00:00.000Z'))
    vi.mocked(PModal).mockImplementation((props: PModalProps) => {
      const initialFocusBeforeContent = props.getInitialFocus?.()

      return (
        <div
          aria-label={props.title}
          data-initial-focus={initialFocusBeforeContent === null ? 'none' : 'available'}
          hidden={!props.isOpen}
          role="dialog"
        >
          <p>{props.description}</p>
          {props.children}
          <button onClick={() => props.getInitialFocus?.()?.focus()} type="button">
            최초 포커스 적용
          </button>
          <button
            onClick={() => {
              props.onOpenChange(false)
              props.onCloseAutoFocus?.()
            }}
            type="button"
          >
            닫기
          </button>
        </div>
      )
    })
  })

  const renderPomodoro = async (onPresentationChange = vi.fn()) => {
    render(() => (
      <PreferenceProvider>
        <PPomodoro onPresentationChange={onPresentationChange} />
      </PreferenceProvider>
    ))
    await vi.advanceTimersByTimeAsync(0)
    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    const timeTrigger = within(quickControls).getByRole('button', {
      name: '포모도로 열기, 집중 준비, 25:00',
    })

    return {onPresentationChange, quickControls, timeTrigger}
  }

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should leave the modal body vertically scrollable', () => {
    render(() => (
      <PreferenceProvider>
        <PPomodoro />
      </PreferenceProvider>
    ))

    expect(vi.mocked(PModal).mock.lastCall?.[0].contentOverflow).toBeUndefined()
  })

  it('should frame the quick controls only in scribble style', () => {
    const originalResult = render(() => (
      <PreferenceProvider>
        <PPomodoro />
      </PreferenceProvider>
    ))
    const originalControls = screen.getByRole('group', {name: '포모도로 간편 조작'})

    expect(originalControls.parentElement?.querySelector('svg')).toBeNull()
    expect(originalControls.classList.contains('rounded-panel')).toBe(true)
    expect(originalControls.classList.contains('border-border')).toBe(true)

    originalResult.unmount()
    render(() => (
      <PreferenceProvider>
        <PPomodoro sceneStyle="scribble" />
      </PreferenceProvider>
    ))
    const scribbleControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    const scribbleFrame = scribbleControls.parentElement as HTMLElement
    const scribbleBorder = scribbleFrame.querySelector('svg')
    const scribbleSurface = scribbleFrame.firstElementChild
    const primaryButton = within(scribbleControls).getByRole('button', {name: '집중 시작'})
    const actionIndicator = primaryButton.lastElementChild
    const actionBorder = actionIndicator?.querySelector('svg')

    expect(scribbleBorder).toBeInstanceOf(SVGElement)
    expect(scribbleFrame?.classList.contains('inline-flex')).toBe(true)
    expect(scribbleBorder?.querySelectorAll('path')).toHaveLength(2)
    expect(scribbleBorder?.querySelectorAll('path')[0]?.getAttribute('stroke-width')).toBe('6')
    expect(scribbleBorder?.querySelectorAll('path')[1]?.getAttribute('stroke-width')).toBe('3')
    expect(actionBorder).toBeInstanceOf(SVGElement)
    expect(actionBorder?.parentElement).toBe(actionIndicator)
    expect(scribbleControls.contains(scribbleBorder)).toBe(false)
    expect(scribbleBorder?.compareDocumentPosition(scribbleControls)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(scribbleControls.classList.contains('relative')).toBe(true)
    expect(scribbleControls.classList.contains('rounded-none')).toBe(true)
    expect(scribbleControls.classList.contains('border-0')).toBe(true)
    expect(scribbleControls.classList.contains('bg-transparent')).toBe(true)
    expect(scribbleSurface?.classList.contains('pomo-scribble-mask')).toBe(true)
    expect(scribbleControls.contains(scribbleSurface)).toBe(false)
    expect(scribbleSurface).not.toHaveAttribute('style')
  })

  it('should use the status icon set matching the scene style', () => {
    const getCharacterImage = () =>
      screen.getByRole('group', {name: '포모도로 간편 조작'}).querySelector<HTMLImageElement>('img')

    const originalResult = render(() => (
      <PreferenceProvider>
        <PPomodoro />
      </PreferenceProvider>
    ))

    expect(getCharacterImage()?.getAttribute('src')).toBe(focusStatusIcon)
    fireEvent.click(screen.getByRole('button', {name: /포모도로 열기/}))
    fireEvent.click(screen.getByRole('button', {name: '다음 단계로 이동'}))
    expect(getCharacterImage()?.getAttribute('src')).toBe(breakStatusIcon)

    originalResult.unmount()
    render(() => (
      <PreferenceProvider>
        <PPomodoro sceneStyle="scribble" />
      </PreferenceProvider>
    ))

    expect(getCharacterImage()?.getAttribute('src')).toBe(scribbleFocusStatusIcon)
    fireEvent.click(screen.getByRole('button', {name: /포모도로 열기/}))
    fireEvent.click(screen.getByRole('button', {name: '다음 단계로 이동'}))
    expect(getCharacterImage()?.getAttribute('src')).toBe(scribbleBreakStatusIcon)
  })

  it('should expose the timer state and primary controls', async () => {
    const {onPresentationChange, quickControls} = await renderPomodoro()
    expect(onPresentationChange).toHaveBeenLastCalledWith({
      phaseLabel: '집중',
      statusLabel: '집중 준비',
      timeLabel: '25:00',
    })

    const primaryButton = within(quickControls).getByRole('button', {name: '집중 시작'})
    const characterEmotion = primaryButton.querySelector('img')?.parentElement
    const actionIndicator = primaryButton.lastElementChild
    expect(characterEmotion?.getAttribute('data-emotion')).toBe('focus')
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
    const playIcon = actionIndicator?.lastElementChild
    expect(playIcon).toBeInstanceOf(HTMLElement)
    expect(playIcon).toHaveClass('i-tabler-player-play', 'w-4', 'h-4')

    fireEvent.click(within(quickControls).getByRole('button', {name: '집중 시작'}))
    expect(within(quickControls).getByRole('button', {name: '일시정지'})).toBeDefined()
    expect(characterEmotion?.getAttribute('data-active')).toBe('')
    const pauseIcon = actionIndicator?.lastElementChild
    expect(pauseIcon).toBeInstanceOf(HTMLElement)
    expect(pauseIcon).toHaveClass('i-tabler-player-pause', 'w-4', 'h-4')

    fireEvent.click(within(quickControls).getByRole('button', {name: '일시정지'}))
    expect(within(quickControls).getByRole('button', {name: '계속하기'})).toBeDefined()
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
    expect(actionIndicator?.lastElementChild).toHaveClass('i-tabler-player-play')
  })

  it('should expose dialog focus and active timer updates', async () => {
    const {onPresentationChange, quickControls, timeTrigger} = await renderPomodoro()
    const characterEmotion = within(quickControls)
      .getByRole('button', {name: '집중 시작'})
      .querySelector('img')?.parentElement
    fireEvent.click(within(quickControls).getByRole('button', {name: '집중 시작'}))
    fireEvent.click(within(quickControls).getByRole('button', {name: '일시정지'}))

    fireEvent.click(timeTrigger)

    const dialog = screen.getByRole('dialog', {name: '포모도로'})
    expect(dialog.hidden).toBe(false)
    expect(dialog.dataset.initialFocus).toBe('none')
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
    vi.advanceTimersToNextFrame()
    expect(within(dialog).getByText('24:59')).toBeDefined()
    expect(onPresentationChange).toHaveBeenLastCalledWith({
      phaseLabel: '집중',
      statusLabel: '집중 중',
      timeLabel: '24:59',
    })

    fireEvent.click(within(dialog).getByRole('button', {name: '일시정지'}))
    expect(within(dialog).getByRole('button', {name: '계속하기'})).toBeDefined()
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
  })

  it('should advance phases, save session settings and restore trigger focus', async () => {
    const {quickControls, timeTrigger} = await renderPomodoro()
    const characterEmotion = within(quickControls)
      .getByRole('button', {name: '집중 시작'})
      .querySelector('img')?.parentElement
    fireEvent.click(within(quickControls).getByRole('button', {name: '집중 시작'}))
    fireEvent.click(within(quickControls).getByRole('button', {name: '일시정지'}))
    fireEvent.click(timeTrigger)
    const dialog = screen.getByRole('dialog', {name: '포모도로'})

    fireEvent.click(within(dialog).getByRole('button', {name: '계속하기'}))
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
    expect(dialog.querySelector('[data-pomo-timer-ring]')).toBeNull()
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
    expect(dialog.querySelector('[data-pomo-timer-ring]')).toBeDefined()
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
    expect(dialog.querySelector('[data-pomo-timer-ring]')).toBeDefined()
    expect(screen.getByLabelText('6회 중 0회 집중 완료')).toBeDefined()
    expect(screen.queryByRole('button', {name: '세션 초기화'})).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(dialog.hidden).toBe(true)
    expect(document.activeElement).toBe(timeTrigger)
  })

  it('should continuously play focus and break phases when automatic playback is enabled', async () => {
    const onEvents = vi.fn()
    localStorage.setItem(
      'pomo:timer-config:v1',
      JSON.stringify({
        focusSeconds: 1,
        focusSessionsPerCycle: 2,
        longBreakSeconds: 1,
        shortBreakSeconds: 1,
      }),
    )
    render(() => (
      <PreferenceProvider>
        <PPomodoro onEvents={onEvents} />
      </PreferenceProvider>
    ))
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
    expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toMatchObject({
      isEnabled: true,
    })

    fireEvent.click(within(dialog).getByRole('button', {name: '집중 시작'}))
    vi.advanceTimersByTime(1_000)
    vi.advanceTimersToNextFrame()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenLastCalledWith(['focus-end', 'break-start'], {isCatchUp: true})

    vi.advanceTimersByTime(1_000)
    vi.advanceTimersToNextFrame()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 집중 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenLastCalledWith(['break-end', 'focus-start'], {isCatchUp: true})

    vi.advanceTimersByTime(1_000)
    vi.advanceTimersToNextFrame()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 긴 휴식 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenLastCalledWith(['focus-end', 'long-break-start'], {
      isCatchUp: true,
    })

    vi.advanceTimersByTime(1_000)
    vi.advanceTimersToNextFrame()
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 집중 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenLastCalledWith(['long-break-end', 'focus-start'], {
      isCatchUp: true,
    })
  })

  it('should report focus and break lifecycle events without replaying starts on resume', async () => {
    const onEvents = vi.fn()
    render(() => (
      <PreferenceProvider>
        <PPomodoro onEvents={onEvents} />
      </PreferenceProvider>
    ))
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
    const firstView = render(() => (
      <PreferenceProvider>
        <PPomodoro />
      </PreferenceProvider>
    ))
    const firstQuickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    fireEvent.click(
      within(firstQuickControls).getByRole('button', {
        name: '포모도로 열기, 집중 준비, 25:00',
      }),
    )
    fireEvent.click(screen.getByRole('switch', {name: '집중·휴식 자동 재생'}))
    firstView.unmount()
    await vi.waitFor(() => {
      expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '{}').isEnabled).toBe(
        true,
      )
    })

    render(() => (
      <PreferenceProvider>
        <PPomodoro />
      </PreferenceProvider>
    ))
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
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
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
    render(() => (
      <PreferenceProvider>
        <PPomodoro onEvents={onEvents} />
      </PreferenceProvider>
    ))
    vi.advanceTimersByTime(1_500)
    resolvePreference('true')
    await vi.advanceTimersByTimeAsync(250)

    const quickControls = screen.getByRole('group', {name: '포모도로 간편 조작'})
    expect(
      within(quickControls).getByRole('button', {name: '포모도로 열기, 휴식 중, 00:01'}),
    ).toBeDefined()
    expect(onEvents).toHaveBeenCalledWith(['focus-end', 'break-start'], {isCatchUp: true})
  })

  it.each([false, true])(
    'should retain progress nodes through live config and completion synchronization (desktopDialog: %s)',
    async (desktopDialog) => {
      const Channel = createTestBroadcastChannel({broadcast: true, removeOnClose: true})
      vi.stubGlobal('BroadcastChannel', Channel)
      const source = new Channel('pomo:pomodoro-timer:v1')
      try {
        render(() => (
          <PreferenceProvider>
            <PPomodoro desktopDialog={desktopDialog} />
          </PreferenceProvider>
        ))
        await vi.advanceTimersByTimeAsync(0)
        if (!desktopDialog) {
          fireEvent.click(screen.getByRole('button', {name: /포모도로 열기/}))
        }
        const progress = screen.getByLabelText('4회 중 0회 집중 완료')
        const markers = Array.from(progress.children)
        const send = (count: number, completed: number, focusSeconds = 1_500) =>
          source.postMessage({
            config: {
              focusSeconds,
              focusSessionsPerCycle: count,
              longBreakSeconds: 900,
              shortBreakSeconds: 300,
            },
            isAutoStartEnabled: false,
            state: {
              completedFocusSessions: completed,
              phase: 'focus',
              remainingSeconds: focusSeconds,
              status: 'idle',
            },
          })

        send(4, 1)
        expect(screen.getByLabelText('4회 중 1회 집중 완료')).toBe(progress)
        expect(progress.children[0]).toHaveAttribute('data-complete', '')
        expect(progress.children[1]).not.toHaveAttribute('data-complete')
        send(6, 2)
        expect(screen.getByLabelText('6회 중 2회 집중 완료')).toBe(progress)
        expect(progress.children).toHaveLength(6)
        markers.forEach((marker, position) => expect(progress.children[position]).toBe(marker))
        expect(progress.children[1]).toHaveAttribute('data-complete', '')
        expect(progress.children[2]).not.toHaveAttribute('data-complete')
        send(6, 2, 1_800)
        expect(screen.getByLabelText('6회 중 2회 집중 완료')).toBe(progress)
        markers.forEach((marker, position) => expect(progress.children[position]).toBe(marker))
        expect(screen.getByRole('button', {name: /6세션 · 집중 30분/})).toBeDefined()
        send(1, 2)
        expect(screen.getByLabelText('1회 중 0회 집중 완료')).toBe(progress)
        expect(progress.children).toHaveLength(1)
        expect(progress.firstElementChild).toBe(markers[0])
        expect(markers.slice(1).every((marker) => !marker.isConnected)).toBe(true)
      } finally {
        source.close()
        vi.unstubAllGlobals()
      }
    },
  )

  it('should preserve progress lifecycle through the real modal portal', async () => {
    // jsdom has no stylesheet animation engine; use the modal suite's no-animation boundary.
    const readStyles = globalThis.getComputedStyle.bind(globalThis)
    const styleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
      const styles = readStyles(element)
      Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
      return styles
    })
    try {
      vi.mocked(PModal).mockImplementation(RealPModal)
      const [style, setStyle] = createSignal<PSceneStyle>('original')
      const view = render(() => (
        <PreferenceProvider>
          <PPomodoro sceneStyle={style()} />
        </PreferenceProvider>
      ))
      await vi.advanceTimersByTimeAsync(0)
      expect(screen.queryByRole('dialog', {name: '포모도로'})).toBeNull()
      const trigger = screen.getByRole('button', {name: /포모도로 열기/})
      fireEvent.click(trigger)
      const dialog = screen.getByRole('dialog', {name: '포모도로'})
      expect(view.container.contains(dialog)).toBe(false)
      const initial = within(dialog).getByLabelText('4회 중 0회 집중 완료')
      fireEvent.click(within(dialog).getByRole('button', {name: '다음 단계로 이동'}))
      expect(within(dialog).getByLabelText('4회 중 1회 집중 완료')).toBe(initial)
      setStyle('scribble')
      expect(within(dialog).getByLabelText('4회 중 1회 집중 완료')).toBe(initial)
      expect(
        within(dialog).getByRole('button', {name: '세션 초기화'}).firstElementChild,
      ).toHaveClass('i-pomo-scribble:refresh')
      fireEvent.click(within(dialog).getByRole('button', {name: /4세션/}))
      expect(initial.isConnected).toBe(false)
      fireEvent.click(within(dialog).getByRole('button', {name: '취소'}))
      const afterEditing = within(dialog).getByLabelText('4회 중 1회 집중 완료')
      expect(afterEditing).not.toBe(initial)
      expect(afterEditing.children).toHaveLength(4)
      expect(afterEditing.firstElementChild).toHaveAttribute('data-complete', '')
      fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))
      await vi.advanceTimersByTimeAsync(0)
      expect(screen.queryByRole('dialog', {name: '포모도로'})).toBeNull()
      expect(afterEditing.isConnected).toBe(false)
      fireEvent.click(trigger)
      const reopened = screen.getByRole('dialog', {name: '포모도로'})
      const progress = within(reopened).getByLabelText('4회 중 1회 집중 완료')
      expect(progress).not.toBe(afterEditing)
      expect(progress.children).toHaveLength(4)
      expect(progress.firstElementChild).toHaveAttribute('data-complete', '')
      fireEvent.click(within(reopened).getByRole('button', {name: '세션 초기화'}))
      expect(within(reopened).getByLabelText('4회 중 0회 집중 완료')).toBe(progress)
      expect(progress.querySelector('[data-complete]')).toBeNull()
    } finally {
      styleSpy.mockRestore()
    }
  })

  it('should preserve an unsupported runtime timer status for exhaustive diagnostics', async () => {
    const invalidState = {
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 1_500,
      status: 'unsupported',
    } as unknown as PomodoroTimerState
    const noOperation = vi.fn()
    vi.resetModules()
    vi.doMock('src/features/pomodoro-timer', async (importOriginal) => {
      const actual = await importOriginal<typeof import('src/features/pomodoro-timer')>()
      const controller = {
        config: () => actual.POMODORO_TIMER_CONFIG,
        isAutoStartEnabled: () => false,
        onAutoStartChange: noOperation,
        onConfigChange: noOperation,
        onNextPhase: noOperation,
        onPause: noOperation,
        onReset: noOperation,
        onStart: noOperation,
        onStop: noOperation,
        progress: () => 0,
        remainingSeconds: () => 1_500,
        state: () => invalidState,
        waitForInitialization: async () => undefined,
      } satisfies PomodoroTimerController

      return {...actual, usePomodoroTimer: () => controller}
    })

    try {
      const {PPomodoro: RuntimePomodoro} = await import('../PPomodoro')
      const result = render(() => (
        <PreferenceProvider>
          <RuntimePomodoro />
        </PreferenceProvider>
      ))

      expect(result.container.querySelector('[data-phase="focus"]')).toBeDefined()
      result.unmount()
    } finally {
      vi.doUnmock('src/features/pomodoro-timer')
    }
  })
  it('should preserve the focused duration draft when scene style changes', async () => {
    const [style, setStyle] = createSignal<PSceneStyle>('original')
    render(() => (
      <PreferenceProvider>
        <PPomodoro desktopDialog sceneStyle={style()} />
      </PreferenceProvider>
    ))
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.click(screen.getByRole('button', {name: /4세션/}))
    const input = screen.getByRole('spinbutton', {name: '집중 시간(분)'})
    fireEvent.input(input, {target: {value: '31'}})
    input.focus()
    setStyle('scribble')
    expect(screen.getByRole('spinbutton', {name: '집중 시간(분)'})).toBe(input)
    expect(input).toHaveValue('31')
    expect(document.activeElement).toBe(input)
  })
})
