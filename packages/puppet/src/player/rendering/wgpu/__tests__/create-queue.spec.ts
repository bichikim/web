import {expect, test, vi} from 'vitest'
import {createGpuQueue} from '../create-queue'
test('should retain ordered exclusive access and recover after an operation fails', async () => {
  const run = createGpuQueue()
  const events: string[] = []
  let finish = () => {}
  const held = new Promise<void>((resolve) => {
    finish = resolve
  })
  const first = run(async () => {
    events.push('first')
    await held
    throw new Error('Failed')
  })
  const rejected = expect(first).rejects.toThrow('Failed')
  const next = vi.fn(() => {
    events.push('second')
    return 42
  })
  const second = run(next)
  await Promise.resolve()
  expect(events).toEqual(['first'])
  expect(next).not.toHaveBeenCalled()
  finish()
  await rejected
  expect(await second).toBe(42)
  expect(events).toEqual(['first', 'second'])
})
