/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {startMicrophone} from '../start-microphone'
import {createLipSyncPublisher} from '../channel'
import {createMicrophonePublisher, subscribeMicrophoneRequests} from '../microphone-channel'
import {useMicrophoneLipSync} from '../use-microphone-lipsync'

vi.mock('../start-microphone', () => ({startMicrophone: vi.fn()}))
vi.mock('../channel', () => ({createLipSyncPublisher: vi.fn()}))
vi.mock('../microphone-channel', () => ({
  createMicrophonePublisher: vi.fn(),
  subscribeMicrophoneRequests: vi.fn().mockResolvedValue(vi.fn()),
}))
afterEach(() => vi.clearAllMocks())

it('should capture without a message or readout and retain the stream while gain and threshold change', async () => {
  const publish = vi.fn()
  const state = vi.fn()
  vi.mocked(createLipSyncPublisher).mockReturnValue(publish)
  vi.mocked(createMicrophonePublisher).mockReturnValue(state)
  vi.mocked(startMicrophone).mockResolvedValue(vi.fn())
  const test = createRoot((dispose) => {
    const [settings, setSettings] = createSignal<PoffoLipSync>({source: 'microphone'})
    useMicrophoneLipSync({settings, widgetId: () => 'widget'})
    return {dispose, setSettings}
  })
  await Promise.resolve()
  expect(startMicrophone).toHaveBeenCalledOnce()
  const first = vi.mocked(startMicrophone).mock.calls[0][0]
  expect(first.deviceId).toBe('')
  test.setSettings({gain: 3, microphone: {threshold: 1}, source: 'microphone'})
  expect(startMicrophone).toHaveBeenCalledOnce()
  first.onFrame({sampleRate: 16000, samples: new Float32Array(640).fill(0.1)})
  expect(publish).toHaveBeenLastCalledWith('microphone', 0, null, expect.any(Object))
  test.setSettings({microphone: {deviceId: 'other'}, source: 'microphone'})
  expect(first.signal.aborted).toBe(true)
  expect(startMicrophone).toHaveBeenCalledTimes(2)
  test.setSettings({source: 'off'})
  expect(vi.mocked(startMicrophone).mock.calls[1][0].signal.aborted).toBe(true)
  expect(state).toHaveBeenLastCalledWith(expect.objectContaining({level: 0, phase: 'off'}))
  test.dispose()
})

it('should ignore late capture completion and stop it after its widget is removed', async () => {
  const pending = Promise.withResolvers<() => void>()
  vi.mocked(startMicrophone).mockReturnValue(pending.promise)
  vi.mocked(createLipSyncPublisher).mockReturnValue(vi.fn())
  vi.mocked(createMicrophonePublisher).mockReturnValue(vi.fn())
  const dispose = createRoot((cleanup) => {
    useMicrophoneLipSync({settings: () => ({source: 'microphone'}), widgetId: () => 'widget'})
    return cleanup
  })
  dispose()
  const stop = vi.fn()
  pending.resolve(stop)
  await pending.promise
  expect(stop).toHaveBeenCalledOnce()
  expect(subscribeMicrophoneRequests).toHaveBeenCalled()
})
