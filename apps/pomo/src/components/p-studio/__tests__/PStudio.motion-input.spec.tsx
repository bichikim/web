/** @vitest-environment jsdom */

import {createMemoryHistory, MemoryRouter, Route} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'

import {DisplayThemeProvider} from 'src/features/display-theme'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import type {PSettingsProps} from 'src/components/settings/types'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {configureStudio, setupStudio, studioMocks} from '../../__tests__/p-studio/setup'
import {PStudio} from '../PStudio'
import {PStudioMotionInputSessionProvider} from '../PStudioMotionInputSessionProvider'
import {createMotionEnvironment} from '../../../features/focus-room-animation/motion-environment'
import {ParallaxController} from '../../../features/focus-room-animation/parallax-controller'

// Keep unrelated client-only imports out of the motion input session tests.
vi.mock('../VersionNoticePanel', () => ({VersionNoticePanel: vi.fn()}))

vi.mock('../../settings/Content', async () => {
  const {PRadioSwitch} = await vi.importActual<
    typeof import('src/components/p-radio-switch/PRadioSwitch')
  >('src/components/p-radio-switch/PRadioSwitch')

  return {
    PSettingsContent: (props: PSettingsProps) => (
      <PRadioSwitch
        label="장면 조작 방식"
        onChange={props.onMotionInputChange ?? (() => undefined)}
        options={[
          {label: '드래그', value: 'drag'},
          {label: '자이로스코프', value: 'gyroscope'},
        ]}
        value={props.motionInput ?? 'drag'}
      />
    ),
  }
})

const modelDownloadRuntime: ModelDownloadRuntime = {
  createTextClient: () => {
    throw new Error('텍스트 모델 client를 만들면 안 됩니다.')
  },
  createVoiceClient: () => {
    throw new Error('음성 모델 client를 만들면 안 됩니다.')
  },
}

const FocusRoomRoute = () => <PStudio />
const AwayRoute = () => <p>다른 화면</p>

const renderRoutedStudio = (history: ReturnType<typeof createMemoryHistory>) =>
  render(() => (
    <PStudioMotionInputSessionProvider>
      <PreferenceProvider>
        <DisplayThemeProvider>
          <PModelDownloadProvider runtime={modelDownloadRuntime}>
            <MemoryRouter history={history}>
              <Route path="/focus-room" component={FocusRoomRoute} />
              <Route path="/away" component={AwayRoute} />
            </MemoryRouter>
          </PModelDownloadProvider>
        </DisplayThemeProvider>
      </PreferenceProvider>
    </PStudioMotionInputSessionProvider>
  ))

const getScene = () => screen.getByRole('button', {name: '장면 로드 완료'}).parentElement
const readStorage = (storage: Storage, ignoredKeys: readonly string[] = []) =>
  Object.fromEntries(
    Array.from({length: storage.length}, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null && !ignoredKeys.includes(key))
      .map((key) => [key, storage.getItem(key)]),
  )
const readMotionSelectionStorage = () => ({
  local: readStorage(localStorage, ['pomo:focus-room-entry-history:v1']),
  session: readStorage(sessionStorage),
})

const prepareStudio = async () => {
  setupStudio()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  )
  const {SceneToolbar} = await vi.importActual<typeof import('../Toolbar')>('../Toolbar')
  vi.mocked(studioMocks.SceneToolbar).mockImplementation((props) => (
    <SceneToolbar
      {...props}
      featureRequestVisible={false}
      memoryAssistVisible={false}
      toolsButtonVisible={false}
      tourButtonVisible={false}
    />
  ))
}

beforeAll(async () => {
  await prepareStudio()
  configureStudio({entrySession: true, gyroscope: true})
  const history = createMemoryHistory()
  history.set({value: '/focus-room'})
  const {unmount} = renderRoutedStudio(history)

  try {
    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    fireEvent.click(screen.getByRole('button', {name: '설정'}))
    await screen.findByRole('radio', {name: '드래그'}, {timeout: 250})
  } finally {
    unmount()
    vi.unstubAllGlobals()
  }
})

beforeEach(async () => {
  await prepareStudio()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('PStudio motion input session', () => {
  it('keeps an explicit toolbar drag choice when the focus-room route remounts', async () => {
    configureStudio({entrySession: true, gyroscope: true})
    const history = createMemoryHistory()
    history.set({value: '/focus-room'})

    renderRoutedStudio(history)

    expect(getScene()).toHaveAttribute('data-motion-input', 'gyroscope')
    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    fireEvent.click(screen.getByRole('button', {name: '설정'}))
    await screen.findByRole('radio', {name: '드래그'}, {timeout: 250})
    const storageBefore = readMotionSelectionStorage()
    fireEvent.click(screen.getByRole('radio', {name: '드래그'}))
    expect(document.querySelector('[data-motion-input]')).toHaveAttribute(
      'data-motion-input',
      'drag',
    )

    history.set({value: '/away'})
    await Promise.resolve()
    expect(screen.getByText('다른 화면')).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '장면 로드 완료'})).not.toBeInTheDocument()
    history.set({value: '/focus-room'})
    await Promise.resolve()

    expect(getScene()).toHaveAttribute('data-motion-input', 'drag')
    expect(history.get()).toBe('/focus-room')
    expect(readMotionSelectionStorage()).toEqual(storageBefore)
  })

  it('uses drag when the device does not support gyroscope input', () => {
    configureStudio({entrySession: true, gyroscope: false})
    const history = createMemoryHistory()
    history.set({value: '/focus-room'})

    renderRoutedStudio(history)

    expect(getScene()).toHaveAttribute('data-motion-input', 'drag')
  })

  it('falls back to drag after gyroscope capability is lost across a route remount', async () => {
    configureStudio({entrySession: true, gyroscope: true})
    const history = createMemoryHistory()
    history.set({value: '/focus-room'})

    renderRoutedStudio(history)

    expect(getScene()).toHaveAttribute('data-motion-input', 'gyroscope')
    history.set({value: '/away'})
    await waitFor(() => expect(screen.getByText('다른 화면')).toBeInTheDocument())
    configureStudio({entrySession: true, gyroscope: false})
    history.set({value: '/focus-room'})

    await waitFor(() => expect(getScene()).toHaveAttribute('data-motion-input', 'drag'))
  })

  it('keeps the real sensor permission fallback across a route remount without auto-requesting', async () => {
    configureStudio({entrySession: true, gyroscope: true})
    const history = createMemoryHistory()
    history.set({value: '/focus-room'})

    renderRoutedStudio(history)

    expect(getScene()).toHaveAttribute('data-motion-input', 'gyroscope')
    const sceneProps = vi.mocked(studioMocks.PStudioScene).mock.calls.at(-1)?.[0]
    const onMotionInputChange = sceneProps?.onMotionInputChange
    expect(onMotionInputChange).toBeDefined()

    const requestPermission = vi.fn(async () => 'denied' as const)
    const DeviceOrientationEventFixture = class extends Event {}
    Object.assign(DeviceOrientationEventFixture, {requestPermission})
    vi.stubGlobal('DeviceOrientationEvent', DeviceOrientationEventFixture)
    const controller = new ParallaxController(document.createElement('div'), () => undefined, {
      environment: createMotionEnvironment(),
      inputMode: 'gyroscope',
      onInputModeChange: onMotionInputChange,
    })
    controller.start()

    expect(requestPermission).not.toHaveBeenCalled()
    globalThis.dispatchEvent(new Event('pointerdown'))
    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce())
    await waitFor(() => expect(getScene()).toHaveAttribute('data-motion-input', 'drag'))
    controller.destroy()

    history.set({value: '/away'})
    await waitFor(() => expect(screen.getByText('다른 화면')).toBeInTheDocument())
    history.set({value: '/focus-room'})

    await waitFor(() => expect(getScene()).toHaveAttribute('data-motion-input', 'drag'))
    expect(requestPermission).toHaveBeenCalledOnce()
  })
})
