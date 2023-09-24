import {useAnimationLoop} from '../'
import {ref} from 'vue'
import {flushPromises} from '@vue/test-utils'

describe('animation-loop', () => {
  afterEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockClear()
  })
  it('should start animation loop', () => {
    let loop: any
    let flag: number = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    const callback = jest.fn()

    const animationLoop = useAnimationLoop(callback)

    animationLoop.start()

    expect(callback).toBeCalledTimes(1)

    loop()

    expect(callback).toBeCalledTimes(2)
  })
  it('should not start animation loop with false active', () => {
    let loop: any
    let flag: number = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    const callback = jest.fn()

    useAnimationLoop(callback)

    expect(callback).toBeCalledTimes(0)
    expect(window.requestAnimationFrame).toBeCalledTimes(0)
  })
  it('should stop animation loop', async () => {
    let loop: any
    let flag: number = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((_loop) => {
      loop = _loop
      flag += 1
      return flag
    })
    jest.spyOn(window, 'cancelAnimationFrame')
    const callback = jest.fn()

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
