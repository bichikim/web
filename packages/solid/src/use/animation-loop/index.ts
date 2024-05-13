import {createUseLoop} from 'src/use/loop'

export const useAnimationLoop = createUseLoop<{__never__?: never}, [DOMHighResTimeStamp]>(
  () => {
    let flag: number | undefined
    const stop = () => {
      if (flag !== undefined) {
        cancelAnimationFrame(flag)
        flag = undefined
      }
    }
    const start = (callback: (...args: any) => void) => {
      flag = requestAnimationFrame(() => {
        callback()
        start(callback)
      })
    }
    return {
      start,
      stop,
    }
  },
)
