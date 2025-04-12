/**
 * @vitest-environment jsdom
 */
import {useEvent} from '../'
import {describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import flushPromises from 'flush-promises'

describe('onEvent', () => {
  it.each([
    //
    {target: window, type: 'click'},
    {target: window, type: 'click'},
    {target: document.createElement('div'), type: 'click'},
  ])('should emit events', async ({target, type}) => {
    vi.spyOn(target, 'addEventListener')
    vi.spyOn(target, 'removeEventListener')
    const callback = vi.fn()

    const {dispose} = createRoot((dispose) => {
      useEvent(target, type, callback)

      return {dispose}
    })

    expect(target.addEventListener).toHaveBeenCalledTimes(1)
    target.dispatchEvent(new MouseEvent(type))
    expect(callback).toHaveBeenCalled()
    dispose()
    expect(target.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('should not throw error when target is null', async () => {
    const callback = vi.fn()

    const {dispose} = createRoot((dispose) => {
      useEvent(null, 'click', callback)

      return {dispose}
    })

    dispose()
    expect(callback).not.toHaveBeenCalled()
  })

  it('should handle event options', async () => {
    const target = document.createElement('div')

    vi.spyOn(target, 'addEventListener')

    const callback = vi.fn()
    const options = {capture: true, passive: true}

    const {dispose} = createRoot((dispose) => {
      useEvent(target, 'click', callback, options)

      return {dispose}
    })

    await flushPromises()

    expect(target.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      options,
    )
    dispose()
  })
})
