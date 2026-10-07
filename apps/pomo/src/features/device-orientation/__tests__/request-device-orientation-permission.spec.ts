import {expect, it, vi} from 'vitest'
import {
  hasDeviceOrientation,
  requestDeviceOrientationPermission,
  requiresDeviceOrientationPermission,
} from '../request-device-orientation-permission'
it('should return unavailable without requesting permission from an unavailable sensor', () => {
  const requestPermission = vi.fn()
  const runtime = {available: false, requestPermission}
  expect(hasDeviceOrientation(runtime)).toBe(false)
  expect(requestDeviceOrientationPermission(runtime)).toBe('unavailable')
  expect(requestPermission).not.toHaveBeenCalled()
})
it('should grant permission synchronously on sensors without a permission operation', () => {
  const runtime = {available: true, requestPermission: null}
  expect(hasDeviceOrientation(runtime)).toBe(true)
  expect(requiresDeviceOrientationPermission(runtime)).toBe(false)
  expect(requestDeviceOrientationPermission(runtime)).toBe('granted')
})
it.each(['granted', 'denied', 'other'] as const)(
  'should normalize sensor permission %s',
  async (permission) => {
    const requestPermission = vi.fn().mockResolvedValue(permission)
    const runtime = {available: true, requestPermission}
    expect(requiresDeviceOrientationPermission(runtime)).toBe(true)
    await expect(requestDeviceOrientationPermission(runtime)).resolves.toBe(
      permission === 'granted' ? 'granted' : 'denied',
    )
    expect(requestPermission).toHaveBeenCalledOnce()
  },
)
it('should preserve a rejected permission operation for caller recovery', async () => {
  const error = new Error('permission unavailable')
  await expect(
    requestDeviceOrientationPermission({
      available: true,
      requestPermission: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
})
it('should preserve a synchronous permission failure for caller recovery', () => {
  const error = new Error('permission unavailable')
  expect(() =>
    requestDeviceOrientationPermission({
      available: true,
      requestPermission: () => {
        throw error
      },
    }),
  ).toThrow(error)
})
