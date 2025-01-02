import {debounce, DebounceSettings} from '@winter-love/lodash'
import {useFakeTimers} from 'sinon'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createUseWait} from '../'

const callback = vi.fn()

vi.spyOn(global, 'setTimeout')
vi.mock('@winter-love/lodash', async () => {
  const actual: any = await vi.importActual('@winter-love/lodash')

  return {
    ...actual,
    debounce: vi.fn(actual.debounce),
  }
})

const setTimeoutWait = createUseWait<Record<string, unknown>>(() => {
  // prepare stage
  let _flag: any
  let _args: any

  return {
    cancel: () => {
      clearTimeout(_flag)
    },
    execute: (args, callback, wait) => {
      _flag = setTimeout(callback, wait, ...args) as any
      _args = [...args]
    },
    flush: (callback) => {
      clearTimeout(_flag)
      callback(..._args)
    },
  }
})
const debounceWait = createUseWait<DebounceSettings>(() => {
  let _flag: any

  return {
    cancel: () => {
      _flag.cancel()
    },
    create: (callback, wait: number, options) => {
      _flag = debounce(
        (...args: any) => {
          callback(...args)
        },
        wait,
        {leading: false, trailing: true, ...options},
      )
    },
    execute: (args) => {
      _flag(...args)
    },
    flush: () => {
      _flag.flush()
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
  ])('should return a function (set timeout)', ({wait, leading, options}) => {
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

    result.execute()

    if (leading) {
      expect(callback).toHaveBeenCalledTimes(1)
      callback.mockClear()
    }

    expect(callback).toHaveBeenCalledTimes(0)

    timer.tick(50)

    result.flush()

    if (leading) {
      expect(callback).toHaveBeenCalledTimes(0)
    } else {
      expect(callback).toHaveBeenCalledTimes(1)
    }

    timer.restore()
  })

  it('should cancel before dispose', () => {
    const callback = vi.fn()
    const timer = useFakeTimers()
    const timeout = 150
    const {wait, dispose} = createRoot((dispose) => {
      const wait = debounceWait(callback, timeout)

      return {dispose, wait}
    })

    wait.execute()
    expect(callback).not.toHaveBeenCalled()
    timer.tick(timeout + 1)

    expect(callback).toHaveBeenCalled()

    callback.mockClear()

    wait.execute()

    dispose()

    timer.tick(timeout + 1)

    expect(callback).not.toHaveBeenCalled()

    timer.restore()
  })

  it.each([
    {
      args: ['hello'],
      waits: [100, 200],
    },
  ])('should accept wait and options accessors', async ({waits, args}) => {
    const callback = vi.fn()
    const timer = useFakeTimers()
    const {wait, dispose} = createRoot((dispose) => {
      const wait = debounceWait(callback, waits[0])

      return {dispose, wait}
    })

    wait.execute(...args)

    expect(callback).not.toHaveBeenCalled()

    timer.tick(50)

    expect(callback).not.toHaveBeenCalled()

    timer.tick(101)

    expect(callback).toHaveBeenCalled()
    dispose()
    timer.restore()
  })
})
