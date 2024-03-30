import {debounce, DebouncedFunc, DebounceSettings} from '@winter-love/lodash'
import {AnyFunction} from '@winter-love/utils'
import {useFakeTimers} from 'sinon'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {waitFactory} from '../'

const callback = vi.fn()
vi.spyOn(global, 'setTimeout')
vi.mock('@winter-love/lodash', async () => {
  const actual: any = await vi.importActual('@winter-love/lodash')
  return {
    ...actual,
    debounce: vi.fn(actual.debounce),
  }
})

const setTimeoutWait = waitFactory<Record<string, unknown>>(() => {
  // prepare stage
  let flag: any
  return {
    cancel: () => {
      clearTimeout(flag)
    },
    execute: (args, callback, wait) => {
      flag = setTimeout(callback, wait, ...args) as any
    },
  }
})

const debounceWait = waitFactory<DebounceSettings>(() => {
  let flag: any
  return {
    cancel: () => {
      flag.cancel()
    },
    create: (callback, wait: number, options) => {
      flag = debounce(
        (...args: any) => {
          callback(...args)
        },
        wait,
        {leading: false, trailing: true, ...options},
      )
    },
    execute: (args) => {
      flag(...args)
    },
  }
})
describe('waitFactory', () => {
  afterEach(() => {
    callback.mockClear()
  })

  it.each([
    //
    {target: setTimeout, wait: setTimeoutWait},
    {options: {}, target: debounce, wait: debounceWait},
    {
      leading: true,
      options: {leading: true},
      target: debounce,
      wait: debounceWait,
    },
  ])('should return a function (set timeout)', ({wait, target, leading, options}) => {
    const timer = useFakeTimers()
    const [waitTime, setWaitTime] = createSignal(100)
    const result = wait(callback, waitTime, options)

    result.execute()
    result.cancel()

    if (leading) {
      expect(callback).toHaveBeenCalledTimes(1)
      callback.mockClear()
    }

    expect(callback).toHaveBeenCalledTimes(0)

    result.execute()

    timer.tick(101)

    result.cancel()

    expect(callback).toHaveBeenCalledTimes(1)
    callback.mockClear()

    // changing wait
    result.execute()

    if (leading) {
      expect(callback).toHaveBeenCalledTimes(1)
      callback.mockClear()
    }

    timer.tick(50)

    setWaitTime(150)

    timer.tick(200)

    expect(callback).toHaveBeenCalledTimes(0)

    callback.mockClear()

    timer.restore()
  })
})
