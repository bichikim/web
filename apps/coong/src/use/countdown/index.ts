import {createSignal} from 'solid-js'
import {useAnimationFrame, type UseAnimationFrameOptions} from 'src/use/animation-frame'

export const useCountdown = (
  wait: number,
  callback: () => void,
  options?: UseAnimationFrameOptions,
) => {
  const [startTime, setStartTime] = createSignal(0)
  const [count, setCount] = createSignal(wait)
  let completed = false

  const interval = useAnimationFrame(() => {
    if (completed) {
      return
    }

    const remaining = wait - (Date.now() - startTime())

    if (remaining <= 0) {
      completed = true
      setCount(0)
      interval.stop()
      callback()

      return
    }

    setCount(remaining)
  }, options)

  const start = () => {
    completed = false
    setCount(wait)
    setStartTime(Date.now())
    interval.start()
  }

  return {
    ...interval,
    count,
    start,
  }
}
