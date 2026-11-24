interface StartTouchAnimationOptions {
  readonly values: Readonly<Record<string, number>>
  readonly duration: number
  readonly pulse: boolean
  readonly onFrame: (values: Readonly<Record<string, number>>) => void
  readonly onComplete: () => void
  readonly onPeak?: () => Readonly<Record<string, number>>
}
const RETURN_EXPONENT = 3
const PULSE_PEAK = 0.5

/** Runs a click pulse or release return using display frames, and returns its cancellation. */
export const startTouchAnimation = (options: StartTouchAnimationOptions): (() => void) => {
  let frame: number | undefined
  let started: number | undefined
  let {values} = options
  let peaked = false
  const update = (time: number) => {
    frame = undefined
    started ??= time
    const progress = Math.min(1, (time - started) / options.duration)
    if (progress === 1) {
      options.onComplete()
      return
    }
    if (options.pulse && !peaked && progress >= PULSE_PEAK && options.onPeak !== undefined) {
      peaked = true
      options.onFrame(values)
      values = options.onPeak()
      if (Object.keys(values).length === 0) {
        options.onComplete()
        return
      }
    }
    const weight = options.pulse ? Math.sin(Math.PI * progress) : (1 - progress) ** RETURN_EXPONENT
    options.onFrame(
      Object.fromEntries(Object.entries(values).map(([id, value]) => [id, value * weight])),
    )
    frame = requestAnimationFrame(update)
  }
  frame = requestAnimationFrame(update)
  return () => {
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }
  }
}
