/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {batch, createEffect, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useResizeObserver} from '..'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

beforeEach(() => {
  TestResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterEach(() => vi.unstubAllGlobals())

describe('useResizeObserver', () => {
  it.each([null, undefined])(
    'should defer observation while the initial target is %s and observe it when available',
    (initialTarget) => {
      const [target, setTarget] = createSignal<Element | null | undefined>(initialTarget)
      const onResize = vi.fn()
      const {result, cleanup} = renderHook(() => useResizeObserver({onResize, target}))

      result.start()
      expect(TestResizeObserver.instances).toHaveLength(0)
      expect(onResize).not.toHaveBeenCalled()

      const element = document.createElement('span')
      setTarget(element)
      expect(TestResizeObserver.instances).toHaveLength(1)
      const observer = TestResizeObserver.instances[0]!
      expect(observer.observe).toHaveBeenCalledExactlyOnceWith(element)
      observer.notify()
      expect(onResize).toHaveBeenCalledExactlyOnceWith([], observer)

      cleanup()
      expect(observer.disconnect).toHaveBeenCalledOnce()
    },
  )

  it('should stay stopped until explicitly started and make repeated operations idempotent', () => {
    const target = document.createElement('div')
    const onResize = vi.fn()
    const {result, cleanup} = renderHook(() => useResizeObserver({onResize, target: () => target}))

    expect(TestResizeObserver.instances).toHaveLength(0)
    result.stop()
    result.start()
    result.start()
    const observer = TestResizeObserver.instances[0]!
    expect(TestResizeObserver.instances).toHaveLength(1)
    expect(observer.observe).toHaveBeenCalledExactlyOnceWith(target)
    observer.notify()
    expect(onResize).toHaveBeenCalledExactlyOnceWith([], observer)
    result.stop()
    result.stop()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    observer.notify()
    expect(onResize).toHaveBeenCalledOnce()
    result.start()
    expect(TestResizeObserver.instances).toHaveLength(2)
    cleanup()
    expect(TestResizeObserver.instances[1]!.disconnect).toHaveBeenCalledOnce()
    result.start()
    expect(TestResizeObserver.instances).toHaveLength(2)
  })

  it('should replace active targets and ignore notifications from disconnected observers', () => {
    const first = document.createElement('div')
    const second = document.createElement('span')
    const [target, setTarget] = createSignal<Element | null | undefined>(first)
    const onResize = vi.fn()
    const {result, cleanup} = renderHook(() => useResizeObserver({onResize, target}))
    result.start()
    const observer = TestResizeObserver.instances[0]!
    setTarget(second)
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(TestResizeObserver.instances[1]!.observe).toHaveBeenCalledExactlyOnceWith(second)
    observer.notify()
    expect(onResize).not.toHaveBeenCalled()
    setTarget(null)
    expect(TestResizeObserver.instances[1]!.disconnect).toHaveBeenCalledOnce()
    setTarget(undefined)
    expect(TestResizeObserver.instances).toHaveLength(2)
    setTarget(first)
    expect(TestResizeObserver.instances[2]!.observe).toHaveBeenCalledExactlyOnceWith(first)
    cleanup()
  })

  it('should observe the latest target on restart after stopped target changes', () => {
    const [target, setTarget] = createSignal<Element | null>(null)
    const {result, cleanup} = renderHook(() => useResizeObserver({onResize: vi.fn(), target}))
    result.start()
    expect(TestResizeObserver.instances).toHaveLength(0)
    result.stop()
    const element = document.createElement('div')
    setTarget(element)
    expect(TestResizeObserver.instances).toHaveLength(0)
    result.start()
    expect(TestResizeObserver.instances[0]!.observe).toHaveBeenCalledExactlyOnceWith(element)
    batch(() => {
      result.stop()
      result.start()
    })
    expect(TestResizeObserver.instances[0]!.disconnect).toHaveBeenCalledOnce()
    expect(TestResizeObserver.instances[1]!.observe).toHaveBeenCalledExactlyOnceWith(element)
    cleanup()
  })

  it('should accept multiple targets, skip absent entries and deduplicate identical elements', () => {
    const first = document.createElement('div')
    const second = document.createElement('span')
    const [target, setTarget] = createSignal<ReadonlyArray<Element | null | undefined>>([])
    const {result, cleanup} = renderHook(() => useResizeObserver({onResize: vi.fn(), target}))
    result.start()
    expect(TestResizeObserver.instances).toHaveLength(0)
    setTarget([first, null, first, undefined, second])
    expect(TestResizeObserver.instances[0]!.observe.mock.calls).toEqual([[first], [second]])
    setTarget([])
    expect(TestResizeObserver.instances[0]!.disconnect).toHaveBeenCalledOnce()
    expect(TestResizeObserver.instances).toHaveLength(1)
    cleanup()
  })

  it('should consume the target iterator once and retain first-occurrence element identities', () => {
    const first = document.createElement('div')
    const second = document.createElement('span')
    const targets = [first, second, first]
    const iterate = vi.fn(() => targets.values())
    Object.defineProperty(targets, Symbol.iterator, {value: iterate})
    const target = vi.fn(() => targets)
    const {result, cleanup} = renderHook(() => useResizeObserver({onResize: vi.fn(), target}))

    result.start()
    result.start()

    expect(target).toHaveBeenCalledOnce()
    expect(iterate).toHaveBeenCalledOnce()
    expect(TestResizeObserver.instances[0]!.observe.mock.calls).toEqual([[first], [second]])
    expect(targets[0]).toBe(first)
    expect(targets[1]).toBe(second)
    expect(targets[2]).toBe(first)
    expect(targets).toHaveLength(3)
    cleanup()
  })

  it('should propagate a target iterator failure before constructing an observer', () => {
    const cause = new Error('Target iterator failed')
    const targets: Element[] = []
    Object.defineProperty(targets, Symbol.iterator, {
      value: () => {
        throw cause
      },
    })
    const {result, cleanup} = renderHook(() =>
      useResizeObserver({onResize: vi.fn(), target: () => targets}),
    )

    expect(() => result.start()).toThrow(cause)
    expect(TestResizeObserver.instances).toHaveLength(0)
    cleanup()
  })

  it('should read current callback state without tracking it or operation callers', () => {
    const [value, setValue] = createSignal(1)
    const [target, setTarget] = createSignal<Element>(document.createElement('div'))
    const values: number[] = []
    const operations = vi.fn()
    const {cleanup} = renderHook(() => {
      const observer = useResizeObserver({onResize: () => values.push(value()), target})
      createEffect(() => {
        operations()
        observer.start()
      })
    })
    TestResizeObserver.instances[0]!.notify()
    setValue(2)
    TestResizeObserver.instances[0]!.notify()
    expect(values).toEqual([1, 2])
    expect(TestResizeObserver.instances).toHaveLength(1)
    setTarget(document.createElement('span'))
    expect(operations).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should tolerate a missing ResizeObserver capability', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const {result, cleanup} = renderHook(() =>
      useResizeObserver({onResize: vi.fn(), target: () => document.createElement('div')}),
    )
    expect(() => {
      result.start()
      result.stop()
      cleanup()
    }).not.toThrow()
  })
})
