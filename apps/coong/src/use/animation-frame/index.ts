import {createEffect, createSignal} from 'solid-js'

export const useAnimationFrame = (callback: () => void) => {
  const [start, setStart] = createSignal(false)
  let interval: any

  createEffect(() => {
    const _start = start()

    if (!_start) {
      return
    }

    const animationFrame = () => {
      callback()
      requestAnimationFrame(animationFrame)
    }

    interval = requestAnimationFrame(animationFrame)

    return () => cancelAnimationFrame(interval)
  })

  return {
    start: () => setStart(true),
    stop: () => setStart(false),
  }
}
