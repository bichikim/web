/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {PGeneralDisplaySettings} from '../Display'

const WakeLockDisplayHarness = () => {
  const wakeLock = useScreenWakeLock()

  return <PGeneralDisplaySettings wakeLock={wakeLock} />
}

beforeEach(() => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  Object.defineProperties(document, {
    exitFullscreen: {configurable: true, value: vi.fn()},
    fullscreenElement: {configurable: true, value: null},
    fullscreenEnabled: {configurable: true, value: true},
  })
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  Reflect.deleteProperty(document, 'exitFullscreen')
  Reflect.deleteProperty(document, 'fullscreenElement')
  Reflect.deleteProperty(document, 'fullscreenEnabled')
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
  Reflect.deleteProperty(navigator, 'wakeLock')
  vi.unstubAllEnvs()
})

it('should remove a stale acquire error after the user turns the real switch off', async () => {
  const pendingRequest = Promise.withResolvers<WakeLockSentinel>()
  const request = vi.fn(() => pendingRequest.promise)
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {request},
  })
  render(() => <WakeLockDisplayHarness />)

  const wakeLockSwitch = screen.getByRole('switch', {name: '화면 자동 꺼짐 방지'})
  await waitFor(() => expect(wakeLockSwitch).toBeEnabled())
  fireEvent.click(wakeLockSwitch)
  await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
  expect(wakeLockSwitch).toBeChecked()
  expect(wakeLockSwitch).toBeEnabled()

  fireEvent.click(wakeLockSwitch)
  expect(wakeLockSwitch).not.toBeChecked()
  pendingRequest.reject(new Error('permission denied'))

  await pendingRequest.promise.catch(() => undefined)
  expect(
    screen.queryByText('화면 유지 요청을 허용하지 못했어요. 브라우저 설정을 확인해 주세요.'),
  ).toBeNull()
})
