import {createRoot} from 'solid-js'
import {createTrigger} from '@winter-love/solid-test'
import {describe, expect, it, vi} from 'vitest'
import {createUseLoop} from '../'

describe('createUseLoop', () => {
  const intervalTrigger = createTrigger()

  const fakeSetInterval = vi.fn((callback, _) => {
    intervalTrigger.target = callback

    return 0
  })

  const fakeClearInterval = vi.fn((_?: number) => {
    intervalTrigger.target = undefined
  })

  it('should be defined', () => {
    const useIntervalLoop = createUseLoop<{time: number}, []>(() => {
      let flag: number | undefined

      return {
        flush: (callback) => {
          if (flag !== undefined) {
            fakeClearInterval(flag)
            callback()
          }
        },
        start: (callback, options) => {
          const {time = 0} = options

          flag = fakeSetInterval(callback, time)
        },
        stop: () => {
          fakeClearInterval(flag)
          flag = undefined
        },
      }
    })
    const callback = vi.fn()

    const {intervalLoop, dispose} = createRoot((dispose) => {
      const intervalLoop = useIntervalLoop(callback)

      return {dispose, intervalLoop}
    })

    expect(fakeSetInterval).toHaveBeenCalledTimes(0)
    expect(fakeClearInterval).toHaveBeenCalledTimes(0)
    intervalLoop.start()
    expect(fakeSetInterval).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledTimes(0)
    intervalTrigger.run()
    expect(callback).toHaveBeenCalledTimes(1)
    intervalTrigger.run()
    expect(callback).toHaveBeenCalledTimes(2)
    intervalLoop.stop()
    expect(fakeClearInterval).toHaveBeenCalledTimes(1)
    dispose()
  })
})
