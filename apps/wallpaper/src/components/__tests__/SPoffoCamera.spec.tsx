/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createCameraSession} from '../../features/tracking/create-camera-session'
import {SPoffoCamera} from '../SPoffoCamera'

vi.mock('../../features/tracking/create-camera-session', () => ({createCameraSession: vi.fn()}))
vi.mock('@tauri-apps/api/core', () => ({isTauri: () => false}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should replace local inference when pose is requested and release capture on disable', () => {
  const stop = vi.fn()
  vi.mocked(createCameraSession).mockReturnValue({stop, update: vi.fn()})
  const [enabled, setEnabled] = createSignal(true)
  const [pose, setPose] = createSignal(false)
  render(() => <SPoffoCamera enabled={enabled} pose={pose} onError={vi.fn()} />)
  expect(createCameraSession).toHaveBeenLastCalledWith(expect.objectContaining({pose: false}))
  setPose(true)
  expect(stop).toHaveBeenCalledTimes(1)
  expect(createCameraSession).toHaveBeenLastCalledWith(expect.objectContaining({pose: true}))
  setEnabled(false)
  expect(stop).toHaveBeenCalledTimes(2)
  expect(createCameraSession).toHaveBeenCalledTimes(2)
})
