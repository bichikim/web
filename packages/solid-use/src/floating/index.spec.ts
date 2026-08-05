/**
 * @vitest-environment jsdom
 */

import {computePosition} from '@floating-ui/dom'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useFloating} from './'
import type {FloatingOptions} from './types'

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(),
}))

const position = (x: number) => ({
  middlewareData: {},
  placement: 'bottom' as const,
  strategy: 'absolute' as const,
  x,
  y: x,
})

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason: unknown) => void = () => undefined
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return {promise, reject, resolve}
}

describe('useFloating', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should remain unpositioned while closed and position after opening', async () => {
    vi.mocked(computePosition).mockResolvedValue(position(10))

    const reference = document.createElement('button')
    const floatingElement = document.createElement('div')
    const {dispose, floating, setOptions} = createRoot((dispose) => {
      const [options, setOptions] = createSignal<FloatingOptions>({open: false})
      const floating = useFloating(reference, floatingElement, options)

      return {dispose, floating, setOptions}
    })

    expect(floating().isPositioned).toBe(false)
    expect(computePosition).not.toHaveBeenCalled()

    setOptions({open: true})
    await Promise.resolve()

    expect(floating()).toMatchObject({isPositioned: true, x: 10, y: 10})
    dispose()
  })

  it('should ignore a stale position result after the reference changes', async () => {
    const firstResult = deferred<ReturnType<typeof position>>()
    const secondResult = deferred<ReturnType<typeof position>>()

    vi.mocked(computePosition)
      .mockReturnValueOnce(firstResult.promise)
      .mockReturnValueOnce(secondResult.promise)

    const firstReference = document.createElement('button')
    const secondReference = document.createElement('button')
    const floatingElement = document.createElement('div')
    const {dispose, floating, setReference} = createRoot((dispose) => {
      const [reference, setReference] = createSignal(firstReference)
      const floating = useFloating(reference, floatingElement, {})

      return {dispose, floating, setReference}
    })

    setReference(secondReference)
    secondResult.resolve(position(20))
    await secondResult.promise
    await Promise.resolve()

    expect(floating()).toMatchObject({isPositioned: true, x: 20})

    firstResult.resolve(position(10))
    await firstResult.promise
    await Promise.resolve()

    expect(floating()).toMatchObject({isPositioned: true, x: 20})
    dispose()
  })

  it('should report the latest positioning error without becoming positioned', async () => {
    const error = new Error('position failed')
    const onError = vi.fn()

    vi.mocked(computePosition).mockRejectedValue(error)

    const reference = document.createElement('button')
    const floatingElement = document.createElement('div')
    const {dispose, floating} = createRoot((dispose) => ({
      dispose,
      floating: useFloating(reference, floatingElement, {onError}),
    }))

    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith(error)
    expect(floating().isPositioned).toBe(false)
    dispose()
  })
})
