import {getWindow} from '@winter-love/utils'

export const useAnimationLoop = (callback: () => unknown) => {
  let flag: number | undefined

  const loop = () => {
    const window = getWindow()
    callback()
    flag = window?.requestAnimationFrame(loop)
  }

  const stop = () => {
    const window = getWindow()
    if (flag) {
      window?.cancelAnimationFrame(flag)
    }
    flag = undefined
  }

  return {
    start: loop,
    stop,
  }
}
