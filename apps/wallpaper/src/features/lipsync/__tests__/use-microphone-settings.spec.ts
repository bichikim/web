/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {waitFor} from '@solidjs/testing-library'
import {requestMicrophone, subscribeMicrophoneState} from '../microphone-channel'
import {useMicrophoneSettings} from '../use-microphone-settings'
import type {MicrophoneState} from '../types'

vi.mock('../microphone-channel', () => ({
  requestMicrophone: vi.fn().mockResolvedValue(undefined),
  subscribeMicrophoneState: vi.fn(),
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it('should use capture devices when settings permission hides their IDs', async () => {
  const media = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn().mockResolvedValue([{deviceId: '', kind: 'audioinput', label: ''}]),
  })
  vi.stubGlobal('navigator', {mediaDevices: media})
  let receive: (state: MicrophoneState) => void = () => undefined
  vi.mocked(subscribeMicrophoneState).mockImplementation(async (_id, callback) => {
    receive = callback
    return () => undefined
  })
  const scope = createRoot((dispose) => ({
    dispose,
    settings: useMicrophoneSettings({enabled: () => true, widgetId: () => 'widget'}),
  }))
  try {
    await Promise.resolve()
    const devices = [
      {id: 'built-in', label: 'MacBook microphone'},
      {id: 'usb', label: 'USB microphone'},
    ]
    receive({devices, level: 0.4, phase: 'listening', widgetId: 'widget'})
    await waitFor(() => expect(scope.settings.devices()).toEqual(devices), {
      interval: 1,
      timeout: 100,
    })
    media.dispatchEvent(new Event('devicechange'))
    await Promise.resolve()
    expect(scope.settings.devices()).toEqual(devices)
    expect(scope.settings.state()?.level).toBe(0.4)
    expect(requestMicrophone).toHaveBeenCalledWith({action: 'read', widgetId: 'widget'})
  } finally {
    scope.dispose()
  }
})
