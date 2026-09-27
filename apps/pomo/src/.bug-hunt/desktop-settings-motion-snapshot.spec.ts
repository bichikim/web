/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopSceneSettingsPublisher} from '../features/desktop-mode/scene-settings'

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly close = vi.fn()
  readonly listeners: Array<(event: MessageEvent) => void> = []
  readonly postMessage = vi.fn((data: unknown) => {
    for (const channel of TestBroadcastChannel.instances) {
      if (channel !== this) {
        for (const listener of channel.listeners) {
          listener(new MessageEvent('message', {data}))
        }
      }
    }
  })

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }
}

beforeEach(() => {
  TestBroadcastChannel.instances = []
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should hydrate a reopened settings window from the toolbar motion snapshot', async () => {
  let motionMode: 'depth' | 'pan' = 'depth'
  let motionInput: 'drag' | 'gyroscope' = 'drag'

  const toolbar = renderHook(() =>
    useDesktopSceneSettingsPublisher({
      handlers: {
        onMotionInputChange: (value) => {
          motionInput = value
        },
        onMotionModeChange: (value) => {
          motionMode = value
        },
      },
      requestSnapshot: true,
    }),
  )

  toolbar.result.publish({name: 'motionMode', value: 'pan'})
  toolbar.result.publish({name: 'motionInput', value: 'gyroscope'})
  motionMode = 'pan'
  motionInput = 'gyroscope'
  expect(motionMode).toBe('pan')
  expect(motionInput).toBe('gyroscope')

  const onMotionModeChange = vi.fn()
  const onMotionInputChange = vi.fn()
  const settings = renderHook(() =>
    useDesktopSceneSettingsPublisher({
      handlers: {onMotionInputChange, onMotionModeChange},
      requestSnapshot: true,
    }),
  )

  await vi.waitFor(() => expect(onMotionModeChange).toHaveBeenCalledExactlyOnceWith('pan'))
  expect(onMotionInputChange).toHaveBeenCalledExactlyOnceWith('gyroscope')

  toolbar.cleanup()
  settings.cleanup()
})
