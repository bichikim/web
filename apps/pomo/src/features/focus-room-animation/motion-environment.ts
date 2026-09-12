export interface MotionSensor {
  requestPermission?: () => Promise<'denied' | 'granted' | 'prompt'>
}

export interface MotionEnvironment {
  readonly window: Pick<Window, 'addEventListener' | 'removeEventListener' | 'matchMedia'>
  readonly document: Pick<Document, 'addEventListener' | 'removeEventListener' | 'hidden'>
  readonly orientation:
    | Pick<ScreenOrientation, 'addEventListener' | 'removeEventListener'>
    | undefined
  readonly getSensor: () => MotionSensor | null
  readonly getAngle: () => number
  readonly requestFrame: (callback: FrameRequestCallback) => number
  readonly cancelFrame: (handle: number) => void
  readonly setTimer: (callback: () => void, delay: number) => number
  readonly clearTimer: (handle: number) => void
}

/** Creates browser bindings borrowed by a motion controller; the controller owns its listeners and timers. */
export const createMotionEnvironment = (): MotionEnvironment => ({
  cancelFrame: (handle) => globalThis.cancelAnimationFrame(handle),
  clearTimer: (handle) => window.clearTimeout(handle),
  document,
  getAngle: () => globalThis.screen.orientation?.angle ?? globalThis.orientation ?? 0,
  getSensor: () =>
    'DeviceOrientationEvent' in globalThis
      ? (DeviceOrientationEvent as typeof DeviceOrientationEvent & MotionSensor)
      : null,
  orientation: globalThis.screen.orientation,
  requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  window,
})
