import {useDebounce} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {createRoot} from 'solid-js'

describe('useDebounce', () => {
  let timer: SinonFakeTimers

  beforeEach(() => {
    timer = useFakeTimers()
  })

  afterEach(() => {
    timer.restore()
  })

  it('should debounce calling the callback function', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {debounce, dispose} = createRoot((dispose) => {
      const debounce = useDebounce(callback, 100, options)

      return {debounce, dispose}
    })

    debounce.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    timer.tick(100)
    expect(callback).toHaveBeenCalledTimes(2)
    dispose()
  })

  it('should cancel debounce with dispose', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {debounce, dispose} = createRoot((dispose) => {
      const debounce = useDebounce(callback, 100, options)

      return {debounce, dispose}
    })

    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    dispose()
    timer.tick(100)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel debounce', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {debounce} = createRoot((dispose) => {
      const debounce = useDebounce(callback, 100, options)

      return {debounce, dispose}
    })

    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    debounce.cancel()
    timer.tick(100)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should flush debounce', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {debounce} = createRoot((dispose) => {
      const debounce = useDebounce(callback, 100, options)

      return {debounce, dispose}
    })

    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    debounce.flush()
    expect(callback).toHaveBeenCalledTimes(2)
    timer.tick(100)
    expect(callback).toHaveBeenCalledTimes(2)
  })
})
