/** Runs native calculation ticks only while the renderer owns the animation clock. */
export const createGpuClock = () => {
  const millisecondsPerSecond = 1000
  let running = true
  let request: number | undefined
  let previous: number | undefined
  let listener: ((delta: number) => void) | undefined
  const schedule = () => {
    if (running && listener !== undefined && request === undefined) {
      request = requestAnimationFrame(tick)
    }
  }
  const tick = (time: number) => {
    request = undefined
    if (!running) {
      return
    }
    const delta =
      previous === undefined ? 0 : Math.max(0, (time - previous) / millisecondsPerSecond)
    previous = time
    listener?.(delta)
    schedule()
  }
  const setRunning = (next: boolean) => {
    running = next
    previous = undefined
    if (!next && request !== undefined) {
      cancelAnimationFrame(request)
      request = undefined
    }
    schedule()
  }
  return {
    destroy: () => {
      setRunning(false)
    },
    setRunning,
    subscribeFrame(next: (delta: number) => void) {
      listener = next
      schedule()
    },
  }
}
