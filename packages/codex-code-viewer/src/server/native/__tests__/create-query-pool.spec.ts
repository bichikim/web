import {describe, expect, it} from 'vitest'
import {createQueryPool} from '../create-query-pool'

describe('createQueryPool', () => {
  it('should bound requests and release a slot after rejection', async () => {
    const pool = createQueryPool(2)
    const first = Promise.withResolvers<number>()
    const second = Promise.withResolvers<number>()
    const started: number[] = []
    const tasks = [first, second].map((task, index) =>
      pool(async () => {
        started.push(index)
        return task.promise
      }),
    )
    const third = pool(async () => {
      started.push(2)
      return 3
    })
    expect(started).toEqual([0, 1])
    const failed = expect(tasks[0]).rejects.toThrow('unavailable')
    first.reject(new Error('unavailable'))
    await failed
    expect(await third).toBe(3)
    second.resolve(2)
    expect(await tasks[1]).toBe(2)
    expect(started).toEqual([0, 1, 2])
  })

  it('should reject limits that cannot start work', () => {
    expect(() => createQueryPool(0)).toThrow(RangeError)
    expect(() => createQueryPool(1.5)).toThrow(RangeError)
  })
})
