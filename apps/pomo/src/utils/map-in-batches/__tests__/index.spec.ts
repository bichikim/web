/** @vitest-environment node */
import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {mapInBatches} from '..'

describe('mapInBatches', () => {
  it('should skip the mapper for empty input', async () => {
    const map = vi.fn(async (item: number) => item)
    await expect(mapInBatches([], {batchSize: 8, map})).resolves.toEqual([])
    expect(map).not.toHaveBeenCalled()
  })

  it('should wait for the whole batch and retain input order through the final partial batch', async () => {
    const items = Object.freeze(Array.from({length: 17}, (_, index) => index))
    const gates = items.map(() => Promise.withResolvers<number>())
    const secondStarted = Promise.withResolvers<void>()
    const finalStarted = Promise.withResolvers<void>()
    const started: number[] = []
    const result = mapInBatches(items, {
      batchSize: 8,
      map: (item) => {
        started.push(item)
        if (started.length === 16) {
          secondStarted.resolve()
        }
        if (started.length === 17) {
          finalStarted.resolve()
        }
        return gates[item].promise
      },
    })

    expect(started).toEqual(items.slice(0, 8))
    gates
      .slice(1, 8)
      .toReversed()
      .forEach((gate, index) => gate.resolve(7 - index))
    await Promise.all(gates.slice(1, 8).map((gate) => gate.promise))
    expect(started).toHaveLength(8)
    gates[0].resolve(0)
    await secondStarted.promise
    expect(started).toEqual(items.slice(0, 16))
    gates
      .slice(8, 16)
      .toReversed()
      .forEach((gate, index) => gate.resolve(15 - index))
    await finalStarted.promise
    expect(started).toEqual(items)
    gates[16].resolve(16)
    await expect(result).resolves.toEqual(items)
  })

  it('should preserve duplicate items, nullish results and result types', async () => {
    const item = {value: 0}
    const items = Object.freeze([item, item])
    const map = vi.fn(async (value: typeof item) => value)
    const duplicates = await mapInBatches(items, {batchSize: 1, map})
    expect(duplicates).toEqual(items)
    expect(duplicates[0]).toBe(item)
    expect(duplicates[1]).toBe(item)
    expect(map.mock.calls).toEqual([[item], [item]])
    const values = await mapInBatches([null, undefined, false, 0] as const, {
      batchSize: 2,
      map: async (value) => value,
    })
    expect(values).toEqual([null, undefined, false, 0])
    expectTypeOf(values).toEqualTypeOf<Array<null | undefined | false | 0>>()
  })

  it('should snapshot all input batches before the first mapper runs', async () => {
    const items = [1, 2, 3]
    const result = mapInBatches(items, {
      batchSize: 1,
      map: async (item) => {
        items.splice(0, items.length, 9)
        return item
      },
    })
    await expect(result).resolves.toEqual([1, 2, 3])
    expect(items).toEqual([9])
  })

  it('should reject with the original reason without starting later batches or cancelling siblings', async () => {
    const first = Promise.withResolvers<number>()
    const sibling = Promise.withResolvers<number>()
    const finished = Promise.withResolvers<void>()
    const reason = {code: 'unavailable'}
    const map = vi.fn((item: number) => {
      if (item === 1) {
        return first.promise
      }
      return sibling.promise.then((value) => {
        finished.resolve()
        return value
      })
    })
    const result = mapInBatches([1, 2, 3], {batchSize: 2, map})
    const rejection = expect(result).rejects.toBe(reason)
    first.reject(reason)
    await rejection
    expect(map.mock.calls).toEqual([[1], [2]])
    sibling.resolve(2)
    await finished.promise
    expect(map.mock.calls).toEqual([[1], [2]])
  })

  it('should preserve synchronous mapper failures and start the remaining batch siblings', async () => {
    const reason = new Error('mapper failed')
    const map = vi.fn((): Promise<number> => {
      throw reason
    })
    await expect(mapInBatches([1, 2, 3], {batchSize: 2, map})).rejects.toBe(reason)
    expect(map.mock.calls).toEqual([[1], [2]])
  })

  it('should observe earlier rejected work when a later mapper throws synchronously', async () => {
    const earlier = new Error('earlier rejected work')
    const later = new Error('later synchronous mapper failure')
    const map = vi.fn((item: number): Promise<number> => {
      if (item === 1) {
        return Promise.reject(earlier)
      }
      if (item === 2) {
        throw later
      }
      return Promise.resolve(item)
    })
    await expect(mapInBatches([1, 2, 3, 4], {batchSize: 3, map})).rejects.toBe(earlier)
    expect(map.mock.calls).toEqual([[1], [2], [3]])
  })

  it('should keep overlapping invocations independent', async () => {
    const first = Promise.withResolvers<number>()
    const second = Promise.withResolvers<number>()
    const firstMap = vi.fn((item: number) => (item === 1 ? first.promise : Promise.resolve(item)))
    const secondMap = vi.fn((item: number) => (item === 3 ? second.promise : Promise.resolve(item)))
    const firstResult = mapInBatches([1, 2], {batchSize: 1, map: firstMap})
    const secondResult = mapInBatches([3, 4], {batchSize: 1, map: secondMap})
    expect(firstMap.mock.calls).toEqual([[1]])
    expect(secondMap.mock.calls).toEqual([[3]])
    second.resolve(3)
    await expect(secondResult).resolves.toEqual([3, 4])
    expect(firstMap.mock.calls).toEqual([[1]])
    first.resolve(1)
    await expect(firstResult).resolves.toEqual([1, 2])
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'should reject invalid batch size %s before invoking the mapper',
    async (batchSize) => {
      const map = vi.fn(async (item: number) => item)
      await expect(mapInBatches([1], {batchSize, map})).rejects.toThrow(
        'Size must be an integer greater than zero.',
      )
      expect(map).not.toHaveBeenCalled()
    },
  )
})
