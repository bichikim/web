/**
 * @vitest-environment jsdom
 */
import {useAnimationLoop} from '../'
import {describe, it, expect, vi, afterEach} from 'vitest'
describe('animation-loop', () => {
  afterEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockClear()
  })
  it('should start animation loop', () => {
    let loop: any
    let flag: number = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    const callback = vi.fn()

    const animationLoop = useAnimationLoop(callback)

    animationLoop.start()

    expect(callback).toBeCalledTimes(1)

    loop()

    expect(callback).toBeCalledTimes(2)
  })
  it('should not start animation loop with false active', () => {
    let loop: any
    let flag: number = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    const callback = vi.fn()

    useAnimationLoop(callback)

    expect(callback).toBeCalledTimes(0)
    expect(window.requestAnimationFrame).toBeCalledTimes(0)
  })
  it('should stop animation loop', async () => {
    let loop: any
    let flag: number = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    vi.spyOn(window, 'cancelAnimationFrame')
    const callback = vi.fn()

    const animationLoop = useAnimationLoop(callback)

    animationLoop.start()

    expect(callback).toBeCalledTimes(1)

    loop()

    expect(callback).toBeCalledTimes(2)

    animationLoop.stop()

    expect(window.cancelAnimationFrame).toBeCalledTimes(1)
    expect(callback).toBeCalledTimes(2)
    expect(window.cancelAnimationFrame).toBeCalledWith(flag)
  })
})
