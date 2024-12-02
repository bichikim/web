import {onScopeDispose, ref} from 'vue'

const DEFAULT_TICK = 100
export const useUntilTo = (initValue: number) => {
  const countRef = ref(initValue)
  let clearFlag

  const run = (until: number, step: number, tick: number = DEFAULT_TICK) => {
    clearInterval(clearFlag)
    const __step = Math.abs(step)
    const {value} = countRef
    const _step = value < until ? __step : __step * -1
    const compare = value < until ? (value) => value >= until : (value) => value <= until
    clearFlag = setInterval(() => {
      if (compare(countRef.value)) {
        clearInterval(clearFlag)
        countRef.value = until
        return
      }
      countRef.value += _step
    }, tick)
  }

  const stop = () => {
    clearInterval(clearFlag)
  }

  onScopeDispose(() => {
    clearInterval(clearFlag)
  })

  return {
    run,
    stop,
    value: countRef,
  }
}
