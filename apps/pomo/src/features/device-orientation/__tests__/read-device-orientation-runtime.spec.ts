/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {readDeviceOrientationRuntime} from '../read-device-orientation-runtime'
afterEach(() => vi.unstubAllGlobals())
it('should bind the permission operation to the platform receiver', async () => {
  const orientation = {requestPermission: vi.fn().mockResolvedValue('granted')}
  vi.stubGlobal('DeviceOrientationEvent', orientation)
  vi.stubGlobal('isSecureContext', true)
  const runtime = readDeviceOrientationRuntime()
  expect(runtime.available).toBe(true)
  await expect(runtime.requestPermission?.()).resolves.toBe('granted')
  expect(orientation.requestPermission.mock.contexts).toEqual([orientation])
})
it('should expose an unavailable sensor when the constructor is missing', () => {
  vi.stubGlobal('DeviceOrientationEvent', undefined)
  expect(readDeviceOrientationRuntime()).toEqual({available: false, requestPermission: null})
})
it('should expose an unavailable sensor in an insecure context', () => {
  vi.stubGlobal('DeviceOrientationEvent', class {})
  vi.stubGlobal('isSecureContext', false)
  expect(readDeviceOrientationRuntime()).toEqual({available: false, requestPermission: null})
})
