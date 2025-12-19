import {createSignal} from 'solid-js'
import {useAnimationFrame} from 'src/use/animation-frame'

export const useCountdown = (wait: number, callback: () => void) => {
  const [startTime, setStartTime] = createSignal(0)
  const [count, setCount] = createSignal(wait)

  const interval = useAnimationFrame(() => {
    setCount(wait - (Date.now() - startTime()))

    if (count() <= 0) {
      setCount(0)
      callback()
    }
  })

  const start = () => {
    setStartTime(Date.now())
    interval.start()
  }

  return {
    ...interval,
    count,
    start,
  }
}
