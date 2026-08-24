/**
 * @vitest-environment jsdom
 */
import {type Emitter, useEvent} from './'
import {createRoot, createSignal} from 'solid-js'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'

describe('useEvent', () => {
  it.each([
    {target: window, type: 'click'},
    {target: document, type: 'visibilitychange'},
    {target: document.createElement('div'), type: 'click'},
  ])('should register once and remove once for $type', ({target, type}) => {
    vi.spyOn(target, 'addEventListener')
    vi.spyOn(target, 'removeEventListener')
    const callback = vi.fn()

    const {dispose} = createRoot((dispose) => {
      useEvent(target, type, callback)

      return {dispose}
    })

    expect(target.addEventListener).toHaveBeenCalledTimes(1)
    target.dispatchEvent(new Event(type))
    expect(callback).toHaveBeenCalledTimes(1)
    dispose()
    expect(target.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('should not register when target is absent', () => {
    const callback = vi.fn()

    const {dispose} = createRoot((dispose) => {
      useEvent(undefined, 'click', callback)

      return {dispose}
    })

    dispose()
    expect(callback).not.toHaveBeenCalled()
  })

  it('should remove the previous reactive target before registering the next target', () => {
    const firstTarget = new EventTarget()
    const secondTarget = new EventTarget()
    const firstAdd = vi.spyOn(firstTarget, 'addEventListener')
    const firstRemove = vi.spyOn(firstTarget, 'removeEventListener')
    const secondAdd = vi.spyOn(secondTarget, 'addEventListener')
    const secondRemove = vi.spyOn(secondTarget, 'removeEventListener')
    const operations: string[] = []
    firstRemove.mockImplementation(() => operations.push('remove-first'))
    secondAdd.mockImplementation(() => operations.push('add-second'))

    const {dispose, setTarget} = createRoot((dispose) => {
      const [target, setTarget] = createSignal<EventTarget | null>(firstTarget)
      useEvent(target, 'change', vi.fn())

      return {dispose, setTarget}
    })

    expect(firstAdd).toHaveBeenCalledTimes(1)
    setTarget(secondTarget)
    expect(operations).toEqual(['remove-first', 'add-second'])
    expect(firstRemove).toHaveBeenCalledTimes(1)
    expect(secondAdd).toHaveBeenCalledTimes(1)

    dispose()
    expect(secondRemove).toHaveBeenCalledTimes(1)
  })

  it('should read the latest reactive value without registering again', () => {
    const target = new EventTarget()
    const add = vi.spyOn(target, 'addEventListener')
    const values: number[] = []

    const {dispose, setValue} = createRoot((dispose) => {
      const [value, setValue] = createSignal(1)
      useEvent(target, 'change', () => values.push(value()))

      return {dispose, setValue}
    })

    target.dispatchEvent(new Event('change'))
    setValue(2)
    target.dispatchEvent(new Event('change'))

    expect(values).toEqual([1, 2])
    expect(add).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('should preserve capture, passive, and once options', () => {
    const target = document.createElement('div')
    const add = vi.spyOn(target, 'addEventListener')
    const remove = vi.spyOn(target, 'removeEventListener')
    const receivers: EventTarget[] = []
    const callback = vi.fn(function (this: EventTarget) {
      receivers.push(this)
    })
    const options = {capture: true, once: true, passive: true}

    const {dispose} = createRoot((dispose) => {
      useEvent(target, 'click', callback, options)

      return {dispose}
    })

    target.dispatchEvent(new MouseEvent('click'))
    target.dispatchEvent(new MouseEvent('click'))
    expect(callback).toHaveBeenCalledTimes(1)
    expect(receivers).toEqual([target])
    expect(add).toHaveBeenCalledWith('click', callback, options)
    dispose()
    expect(remove).toHaveBeenCalledWith('click', callback, options)
  })

  it('should preserve boolean capture identity', () => {
    const target = new EventTarget()
    const remove = vi.spyOn(target, 'removeEventListener')
    const callback = vi.fn()

    const dispose = createRoot((dispose) => {
      useEvent(target, 'change', callback, true)
      return dispose
    })

    dispose()
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function), true)
  })

  it('should remain safe when an AbortSignal removes the listener before owner cleanup', () => {
    const target = new EventTarget()
    const remove = vi.spyOn(target, 'removeEventListener')
    const callback = vi.fn()
    const controller = new AbortController()

    const dispose = createRoot((dispose) => {
      useEvent(target, 'change', callback, {signal: controller.signal})
      return dispose
    })

    controller.abort()
    target.dispatchEvent(new Event('change'))
    dispose()
    target.dispatchEvent(new Event('change'))

    expect(callback).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('should infer platform event maps', () => {
    class LegacyEmitter implements Emitter {
      addEventListener(
        _type: string,
        _listener: EventListener,
        _options?: AddEventListenerOptions,
      ) {}

      removeEventListener(
        _type: string,
        _listener: EventListener,
        _options?: EventListenerOptions,
      ) {}
    }

    expectTypeOf<LegacyEmitter>().toMatchTypeOf<Emitter>()
    const dispose = createRoot((dispose) => {
      useEvent(window, 'resize', (event) => {
        expectTypeOf(event).toEqualTypeOf<UIEvent>()
      })
      useEvent(document, 'visibilitychange', (event) => {
        expectTypeOf(event).toEqualTypeOf<Event>()
      })
      useEvent(document.createElement('button'), 'click', (event) => {
        expectTypeOf(event).toEqualTypeOf<PointerEvent>()
      })
      useEvent(new EventTarget(), 'change', (event) => {
        expectTypeOf(event).toEqualTypeOf<Event>()
      })
      useEvent(window, 'pomo:change', (event) => {
        expectTypeOf(event).toEqualTypeOf<CustomEvent<unknown>>()
      })

      return dispose
    })

    dispose()
  })
})
