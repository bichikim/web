import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {forEachSequential} from '..'

describe('forEachSequential', () => {
  it('should pull and start each generator item only after the preceding callback succeeds', async () => {
    const events: string[] = []
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const secondStart = Promise.withResolvers<void>()
    function* values() {
      try {
        events.push('pull first')
        yield first
        events.push('pull second')
        yield second
      } finally {
        events.push('close')
      }
    }
    const pending = forEachSequential(values(), async (value) => {
      const name = value === first ? 'first' : 'second'
      events.push(`start ${name}`)
      if (value === second) {
        secondStart.resolve()
      }
      await value.promise
      events.push(`finish ${name}`)
    })
    expectTypeOf(pending).toEqualTypeOf<Promise<void>>()
    expect(events).toEqual(['pull first', 'start first'])
    first.resolve()
    await secondStart.promise
    expect(events).toEqual([
      'pull first',
      'start first',
      'finish first',
      'pull second',
      'start second',
    ])
    second.resolve()
    expect(await pending).toBeUndefined()
    expect(events).toEqual([
      'pull first',
      'start first',
      'finish first',
      'pull second',
      'start second',
      'finish second',
      'close',
    ])
  })

  it.each(['throw', 'reject'] as const)(
    'should stop after a callback %s, preserve its error and close the iterator',
    async (mode) => {
      const error = new Error('callback failed')
      const events: string[] = []
      const failure = Promise.withResolvers<void>()
      function* values() {
        try {
          events.push('pull first')
          yield 1
          events.push('pull second')
          yield 2
        } finally {
          events.push('close')
        }
      }
      const callback = vi.fn((): Promise<void> => {
        if (mode === 'throw') {
          throw error
        }
        return failure.promise
      })
      const pending = forEachSequential(values(), callback)
      const result = pending.catch((reason: unknown) => reason)
      if (mode === 'reject') {
        expect(events).toEqual(['pull first'])
        expect(callback).toHaveBeenCalledExactlyOnceWith(1)
        failure.reject(error)
      }
      expect(await result).toBe(error)
      expect(callback).toHaveBeenCalledExactlyOnceWith(1)
      expect(events).toEqual(['pull first', 'close'])
    },
  )

  it('should resolve without invoking the callback for empty input', async () => {
    const callback = vi.fn(async () => {})
    expect(await forEachSequential([], callback)).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
  })

  it('should accept non-array iterables and infer each callback item', async () => {
    const names: string[] = []
    await forEachSequential(new Set([{name: 'first'}, {name: 'second'}]), async (item) => {
      expectTypeOf(item).toEqualTypeOf<{name: string}>()
      names.push(item.name)
    })
    expect(names).toEqual(['first', 'second'])
  })

  it('should propagate iteration errors after completing earlier callbacks', async () => {
    const error = new Error('iteration failed')
    const callback = vi.fn(async (_value: number) => {})
    function* values() {
      yield 1
      throw error
    }
    const failure = await forEachSequential(values(), callback).catch((reason: unknown) => reason)
    expect(failure).toBe(error)
    expect(callback).toHaveBeenCalledExactlyOnceWith(1)
  })
})
