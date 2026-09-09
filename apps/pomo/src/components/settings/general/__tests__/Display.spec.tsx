/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {PSelect} from 'src/components/PSelect'
import {PSwitch} from 'src/components/PSwitch'
import {useFullscreen} from 'src/features/fullscreen'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {beforeEach, expect, it, vi} from 'vitest'
import {PGeneralDisplaySettings} from '../Display'
vi.mock('src/components/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/components/PSwitch', () => ({PSwitch: vi.fn()}))
vi.mock('src/features/fullscreen', () => ({useFullscreen: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
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
})
it('should expose the five-second screen saver delay during development', () => {
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)

  const screenSaverSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '스크린 세이버')

  expect(screenSaverSelect?.options).toContainEqual({label: '5초 후', value: '5s'})
})

it('should omit the development-only screen saver delay in production mode', () => {
  vi.stubEnv('DEV', false)
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)

  const screenSaverSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '스크린 세이버')

  expect(screenSaverSelect?.options).not.toContainEqual({label: '5초 후', value: '5s'})
  vi.unstubAllEnvs()
})

it('should describe every wake-lock availability state and pending request', () => {
  const states = [
    {availability: () => 'checking' as const, isRequestPending: () => false},
    {availability: () => 'supported' as const, isRequestPending: () => false},
    {availability: () => 'supported' as const, isRequestPending: () => true},
    {availability: () => 'unsupported' as const, isRequestPending: () => false},
  ]

  for (const state of states) {
    vi.mocked(useScreenWakeLock).mockReturnValue({
      ...state,
      errorMessage: () => null,
      isEnabled: () => false,
      onEnabledChange: vi.fn(),
    })
    render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
    expect(
      screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
    ).toHaveAttribute('data-description', expect.any(String))
  }

  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'unsupported',
    errorMessage: () => '권한을 확인할 수 없어요.',
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
  expect(
    screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
  ).toHaveAttribute('data-description', '권한을 확인할 수 없어요.')

  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'future-runtime' as never,
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
  expect(
    screen.getAllByRole('button', {hidden: true, name: '화면 자동 꺼짐 방지'}).at(-1),
  ).toHaveAttribute('data-description', 'future-runtime')
})

it('should describe every full-screen availability, pending, and failure state', () => {
  const states = [
    {availability: () => 'checking' as const, error: () => null, isRequestPending: () => false},
    {availability: () => 'supported' as const, error: () => null, isRequestPending: () => false},
    {availability: () => 'supported' as const, error: () => null, isRequestPending: () => true},
    {availability: () => 'unsupported' as const, error: () => null, isRequestPending: () => false},
    {
      availability: () => 'supported' as const,
      error: () => 'enter-failed' as const,
      isRequestPending: () => false,
    },
    {
      availability: () => 'supported' as const,
      error: () => 'exit-failed' as const,
      isRequestPending: () => false,
    },
  ]

  for (const state of states) {
    vi.mocked(useFullscreen).mockReturnValue({
      ...state,
      isEnabled: () => false,
      onEnabledChange: vi.fn(),
    })
    render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
    expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
      'data-description',
      expect.any(String),
    )
  }

  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'future-runtime' as never,
    error: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
  expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
    'data-description',
    'future-runtime',
  )

  vi.mocked(useFullscreen).mockReturnValue({
    availability: () => 'supported',
    error: () => 'future-error' as never,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
  expect(screen.getAllByRole('button', {hidden: true, name: '전체 화면'}).at(-1)).toHaveAttribute(
    'data-description',
    'future-error',
  )
})

it('should show the guide-button preference and forward its change', () => {
  const onTourButtonVisibleChange = vi.fn()
  render(() => (
    <PGeneralDisplaySettings
      wakeLock={useScreenWakeLock()}
      onTourButtonVisibleChange={onTourButtonVisibleChange}
    />
  ))
  const control = screen.getByRole('button', {name: '투어 버튼 표시'})
  expect(control).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(control)
  expect(onTourButtonVisibleChange).toHaveBeenCalledWith(false)
})

it('should preserve a hidden guide-button preference', () => {
  render(() => (
    <PGeneralDisplaySettings
      wakeLock={useScreenWakeLock()}
      tourButtonVisible={false}
      onTourButtonVisibleChange={vi.fn()}
    />
  ))
  expect(screen.getByRole('button', {name: '투어 버튼 표시'})).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

it('should omit the guide-button preference without a change callback', () => {
  render(() => <PGeneralDisplaySettings wakeLock={useScreenWakeLock()} />)
  expect(screen.queryByRole('button', {name: '투어 버튼 표시'})).not.toBeInTheDocument()
})

it('should show both toolbar toggles enabled by default and emit hidden choices', () => {
  const tools = vi.fn()
  const memory = vi.fn()
  render(() => (
    <PGeneralDisplaySettings
      wakeLock={useScreenWakeLock()}
      onToolsButtonVisibleChange={tools}
      onMemoryAssistVisibleChange={memory}
    />
  ))
  for (const [label, change] of [
    ['도구 표시', tools],
    ['기억보조 표시', memory],
  ] as const) {
    const control = screen.getByRole('button', {name: label})
    expect(control).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(control)
    expect(change).toHaveBeenCalledWith(false)
  }
})

it('should expose independent player and Pomodoro switches', () => {
  const player = vi.fn()
  const pomodoro = vi.fn()
  render(() => (
    <PGeneralDisplaySettings
      wakeLock={useScreenWakeLock()}
      onPlayerVisibleChange={player}
      onPomodoroVisibleChange={pomodoro}
      pomodoroVisible={false}
    />
  ))
  const playerSwitch = screen.getByRole('button', {name: '플레이어 표시'})
  const pomodoroSwitch = screen.getByRole('button', {name: '뽀모도로 표시'})
  expect(playerSwitch).toHaveAttribute('aria-pressed', 'true')
  expect(pomodoroSwitch).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(playerSwitch)
  fireEvent.click(pomodoroSwitch)
  expect(player).toHaveBeenCalledWith(false)
  expect(pomodoro).toHaveBeenCalledWith(true)
})
