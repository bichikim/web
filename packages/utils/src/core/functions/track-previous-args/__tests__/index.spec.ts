import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {trackPreviousArgs} from '../'

describe('trackPreviousArgs', () => {
  it('should remain callable and expose the latest argument snapshot', () => {
    const caller = vi.fn((name: string, count: number) => `${name}:${count}`)
    const trackedCaller = trackPreviousArgs(caller)

    expect(trackedCaller.prevArgs).toBeUndefined()
    expect(trackedCaller('first', 1)).toBe('first:1')
    expect(trackedCaller.prevArgs).toEqual(['first', 1])

    const nextArgs = ['second', 2] as const

    trackedCaller(...nextArgs)
    expect(trackedCaller.prevArgs).toEqual(nextArgs)
    expect(trackedCaller.prevArgs).not.toBe(nextArgs)
    expectTypeOf(trackedCaller).returns.toEqualTypeOf<string>()
  })
})
