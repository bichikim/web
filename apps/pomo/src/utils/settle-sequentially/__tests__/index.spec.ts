import {expect, it} from 'vitest'
import {settleSequentially} from '..'

it('should continue in order after a failure without overlapping tasks', async () => {
  const calls: number[] = []
  let active = 0
  const failure = new Error('second failed')
  const results = await settleSequentially([1, 2, 3], async (item) => {
    expect(active).toBe(0)
    active += 1
    calls.push(item)
    await Promise.resolve()
    active -= 1
    if (item === 2) {
      throw failure
    }
    return item
  })
  expect(calls).toEqual([1, 2, 3])
  expect(results).toEqual([
    {status: 'fulfilled', value: 1},
    {reason: failure, status: 'rejected'},
    {status: 'fulfilled', value: 3},
  ])
  expect(await settleSequentially([], async (item) => item)).toEqual([])
})
