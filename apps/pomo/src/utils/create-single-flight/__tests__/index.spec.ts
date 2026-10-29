/** @vitest-environment node */
import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {createSingleFlight} from '..'

describe('createSingleFlight', () => {
  it('should start immediately and share the stored promise and first operation for a pending key', async () => {
    const source = Promise.withResolvers<{value: number}>()
    const operation = vi.fn(() => source.promise)
    const unused = vi.fn(async () => ({value: 2}))
    const tasks = createSingleFlight<{value: number}>()
    expect(operation).not.toHaveBeenCalled()

    const first = tasks.run('same', operation)
    expect(operation).toHaveBeenCalledOnce()
    const second = tasks.run('same', unused)
    expect(second).toBe(first)
    expect(first).not.toBe(source.promise)
    expect(unused).not.toHaveBeenCalled()
    expectTypeOf(first).toEqualTypeOf<Promise<{value: number}>>()

    const value = {value: 1}
    source.resolve(value)
    expect(await first).toBe(value)
    expect(await second).toBe(value)
  })

  it('should release successful work before completion observers request the key again', async () => {
    const tasks = createSingleFlight<number>()
    const operation = vi.fn(async () => 1)
    const first = tasks.run('same', operation)
    const next = first.then(() => tasks.run('same', operation))
    await expect(next).resolves.toBe(1)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should share the original rejection and allow a new attempt after failure', async () => {
    const source = Promise.withResolvers<number>()
    const tasks = createSingleFlight<number>()
    const operation = vi.fn(() => source.promise)
    const first = tasks.run('same', operation)
    const second = tasks.run('same', operation)
    expect(second).toBe(first)
    const reason = {code: 'unavailable'}
    const settled = Promise.allSettled([first, second])
    source.reject(reason)
    await expect(settled).resolves.toEqual([
      {reason, status: 'rejected'},
      {reason, status: 'rejected'},
    ])
    const retry = vi.fn(async () => 2)
    const next = tasks.run('same', retry)
    expect(next).not.toBe(first)
    await expect(next).resolves.toBe(2)
    expect(operation).toHaveBeenCalledOnce()
    expect(retry).toHaveBeenCalledOnce()
  })

  it('should isolate keys and instances while other work is pending', async () => {
    const firstGate = Promise.withResolvers<number>()
    const secondGate = Promise.withResolvers<number>()
    const otherGate = Promise.withResolvers<number>()
    const tasks = createSingleFlight<number>()
    const other = createSingleFlight<number>()
    const first = tasks.run('one', () => firstGate.promise)
    const second = tasks.run('two', () => secondGate.promise)
    const independent = other.run('one', () => otherGate.promise)
    secondGate.resolve(2)
    await expect(second).resolves.toBe(2)
    expect(tasks.run('one', async () => 9)).toBe(first)
    expect(other.run('one', async () => 9)).toBe(independent)
    firstGate.resolve(1)
    otherGate.resolve(3)
    await expect(Promise.all([first, independent])).resolves.toEqual([1, 3])
  })

  it.each([undefined, null, false])('should share and then release a %s result', async (value) => {
    const tasks = createSingleFlight<typeof value>()
    const operation = vi.fn(async () => value)
    const first = tasks.run('same', operation)
    expect(tasks.run('same', operation)).toBe(first)
    await expect(first).resolves.toBe(value)
    const next = tasks.run('same', operation)
    expect(next).not.toBe(first)
    await expect(next).resolves.toBe(value)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should propagate a synchronous throw immediately without registering pending work', async () => {
    const tasks = createSingleFlight<number>()
    const reason = new Error('synchronous failure')
    expect(() =>
      tasks.run('same', () => {
        throw reason
      }),
    ).toThrow(reason)
    await expect(tasks.run('same', async () => 2)).resolves.toBe(2)
  })

  it('should retain the existing synchronous reentry boundary before an operation returns its promise', async () => {
    const tasks = createSingleFlight<number>()
    const outerGate = Promise.withResolvers<number>()
    const innerGate = Promise.withResolvers<number>()
    const replacementGate = Promise.withResolvers<number>()
    let inner: Promise<number> | undefined
    const outer = tasks.run('same', () => {
      inner = tasks.run('same', () => innerGate.promise)
      return outerGate.promise
    })
    expect(inner).not.toBe(outer)
    expect(tasks.run('same', async () => 9)).toBe(outer)

    innerGate.resolve(1)
    await expect(inner).resolves.toBe(1)
    const replacement = vi.fn(() => replacementGate.promise)
    const next = tasks.run('same', replacement)
    expect(replacement).toHaveBeenCalledOnce()
    expect(next).not.toBe(outer)
    outerGate.resolve(2)
    replacementGate.resolve(3)
    await expect(Promise.all([outer, next])).resolves.toEqual([2, 3])
  })
})
