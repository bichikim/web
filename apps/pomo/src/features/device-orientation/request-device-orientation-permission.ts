import {
  type DeviceOrientationRuntime,
  readDeviceOrientationRuntime,
} from './read-device-orientation-runtime'
export type DeviceOrientationPermission = 'granted' | 'denied' | 'unavailable'
export const hasDeviceOrientation = (
  runtime: DeviceOrientationRuntime = readDeviceOrientationRuntime(),
): boolean => runtime.available
export const requiresDeviceOrientationPermission = (
  runtime: DeviceOrientationRuntime = readDeviceOrientationRuntime(),
): boolean => runtime.requestPermission !== null
/** Requests sensor permission when required, preserving synchronous permission-free results. */
export const requestDeviceOrientationPermission = (
  runtime: DeviceOrientationRuntime = readDeviceOrientationRuntime(),
): DeviceOrientationPermission | Promise<DeviceOrientationPermission> => {
  if (!runtime.available) {
    return 'unavailable'
  }
  const {requestPermission} = runtime
  if (requestPermission !== null) {
    return requestPermission().then(
      (permission): DeviceOrientationPermission =>
        permission === 'granted' ? 'granted' : 'denied',
    )
  }
  return 'granted'
}
