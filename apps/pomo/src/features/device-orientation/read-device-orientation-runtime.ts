export interface DeviceOrientationRuntime {
  readonly available: boolean
  readonly requestPermission: (() => Promise<string>) | null
}
/** Reads sensor availability and a permission operation bound to its browser receiver. */
export const readDeviceOrientationRuntime = (): DeviceOrientationRuntime => {
  const orientation = globalThis.DeviceOrientationEvent
  const requestPermission =
    orientation !== undefined && 'requestPermission' in orientation
      ? orientation.requestPermission
      : null
  return {
    available: orientation !== undefined && globalThis.isSecureContext !== false,
    requestPermission:
      typeof requestPermission === 'function' ? () => requestPermission.call(orientation) : null,
  }
}
