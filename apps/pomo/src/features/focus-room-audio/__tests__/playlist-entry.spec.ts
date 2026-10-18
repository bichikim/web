import {describe, expect, it} from 'vitest'
import {hasValidPlaylistEntryIds} from '../playlist-entry'

describe('hasValidPlaylistEntryIds', () => {
  it.each([
    {entryIds: undefined, trackIds: ['one'], valid: false},
    {entryIds: [], trackIds: [], valid: true},
    {entryIds: [], trackIds: ['one'], valid: false},
    {entryIds: ['first', 'second'], trackIds: ['one'], valid: false},
    {entryIds: ['first', 'second'], trackIds: ['one', 'one'], valid: true},
    {entryIds: ['first', 'first'], trackIds: ['one', 'two'], valid: false},
    {entryIds: ['first', ''], trackIds: ['one', 'two'], valid: false},
    {entryIds: [' ', '  '], trackIds: ['one', 'two'], valid: true},
    {entryIds: ['a', 'A', 'é', 'e\u0301'], trackIds: ['one', 'two', 'three', 'four'], valid: true},
  ])(
    'should validate aligned occurrence IDs without normalizing $entryIds',
    ({entryIds, trackIds, valid}) => {
      const previous = entryIds?.slice()
      expect(hasValidPlaylistEntryIds(trackIds, entryIds)).toBe(valid)
      expect(entryIds).toEqual(previous)
    },
  )

  it('should skip element and iterator reads when the lengths do not align', () => {
    const entryIds = ['first']
    Object.defineProperty(entryIds, 'every', {
      get: () => {
        throw new Error('unexpected every')
      },
    })
    Object.defineProperty(entryIds, Symbol.iterator, {
      get: () => {
        throw new Error('unexpected iterator')
      },
    })
    expect(hasValidPlaylistEntryIds([], entryIds)).toBe(false)
  })

  it('should reject empty IDs before reading the iterator', () => {
    const entryIds = ['']
    Object.defineProperty(entryIds, Symbol.iterator, {
      get: () => {
        throw new Error('unexpected iterator')
      },
    })
    expect(hasValidPlaylistEntryIds(['one'], entryIds)).toBe(false)
  })

  it('should preserve array getter and iteration order', () => {
    const trace: string[] = []
    const entryIds = new Proxy(['first', 'second'], {
      get: (target, key, receiver) => {
        trace.push(String(key))
        return Reflect.get(target, key, receiver)
      },
    })
    expect(hasValidPlaylistEntryIds(['one', 'two'], entryIds)).toBe(true)
    expect(trace).toEqual([
      'length',
      'every',
      'length',
      '0',
      '1',
      'Symbol(Symbol.iterator)',
      'length',
      '0',
      'length',
      '1',
      'length',
      'length',
    ])
  })

  it('should use the provided iterator for distinctness after checking stored elements', () => {
    const entryIds = ['first', 'second']
    Object.defineProperty(entryIds, Symbol.iterator, {
      value: function* () {
        yield 'same'
        yield 'same'
      },
    })
    expect(hasValidPlaylistEntryIds(['one', 'two'], entryIds)).toBe(false)
  })

  it.each(['get', 'next'] as const)(
    'should propagate the original iterator %s failure',
    (stage) => {
      const marker = new Error('iterator failure')
      const entryIds = ['first']
      Object.defineProperty(entryIds, Symbol.iterator, {
        get: () => {
          if (stage === 'get') {
            throw marker
          }
          return () => ({
            next: () => {
              throw marker
            },
          })
        },
      })
      let caught: unknown
      try {
        hasValidPlaylistEntryIds(['one'], entryIds)
      } catch (error) {
        caught = error
      }
      expect(caught).toBe(marker)
    },
  )
})
