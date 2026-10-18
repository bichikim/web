/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {nextSlide} from '../playlist'

afterEach(() => vi.restoreAllMocks())

it('should keep shuffled slide ids in the playlist when Math.random returns one', () => {
  vi.spyOn(Math, 'random').mockReturnValue(1)
  const ids = ['a', 'b']

  const slide = nextSlide({current: null, ids, mode: 'random', remaining: []})
  const slideIds = [slide.current, ...slide.remaining]

  expect(slideIds).toHaveLength(ids.length)
  expect(slideIds).toEqual(expect.arrayContaining(ids))
})

it('should repeat sequentially and start from the first item after deleting the current item', () => {
  expect(
    nextSlide({current: 'a', ids: ['a', 'b'], mode: 'sequential', remaining: []}).current,
  ).toBe('b')
  expect(
    nextSlide({current: 'b', ids: ['a', 'b'], mode: 'sequential', remaining: []}).current,
  ).toBe('a')
  expect(nextSlide({current: 'a', ids: ['b'], mode: 'sequential', remaining: []}).current).toBe('b')
})

it('should visit every item once per shuffled cycle without repeating across cycles', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const ids = ['a', 'b', 'c']
  let state = {current: null as string | null, remaining: [] as readonly string[]}
  const seen: string[] = []
  for (let index = 0; index < 9; index += 1) {
    state = nextSlide({...state, ids, mode: 'random'})
    seen.push(state.current!)
  }
  expect(new Set(seen.slice(0, 3)).size).toBe(3)
  expect(new Set(seen.slice(3, 6)).size).toBe(3)
  expect(new Set(seen.slice(6, 9)).size).toBe(3)
  expect(seen.every((id, index) => index === 0 || id !== seen[index - 1])).toBe(true)
})

it('should handle empty and single-item lists and discard deleted queued items', () => {
  expect(nextSlide({current: 'a', ids: [], mode: 'random', remaining: ['a']})).toEqual({
    current: null,
    remaining: [],
  })
  expect(nextSlide({current: 'a', ids: ['a'], mode: 'random', remaining: []}).current).toBe('a')
  expect(
    nextSlide({current: 'a', ids: ['a', 'b'], mode: 'random', remaining: ['deleted', 'b']}).current,
  ).toBe('b')
})

it('should consume the remaining sequential queue before catalog order', () => {
  expect(
    nextSlide({
      current: 'a',
      ids: ['a', 'b', 'c'],
      mode: 'sequential',
      remaining: ['c', 'b'],
      seen: ['a'],
    }),
  ).toMatchObject({current: 'c', remaining: ['b']})
})

it('should not reshuffle an in-progress random queue', () => {
  const random = vi.spyOn(Math, 'random')
  const slide = nextSlide({
    current: 'a',
    ids: ['a', 'b', 'c', 'd'],
    mode: 'random',
    remaining: ['d', 'c', 'b'],
    seen: ['a'],
  })

  expect(slide).toMatchObject({current: 'd', remaining: ['c', 'b']})
  expect(random).not.toHaveBeenCalled()
})

it.each(['sequential', 'random'] as const)(
  'should not replay a companion before the %s cycle ends',
  (mode) => {
    const ids = ['a', 'b', 'c', 'd']
    let state = nextSlide({current: null, ids, mode, remaining: []})
    const first = state.current!
    const companion = state.remaining[1]!
    state = {
      ...state,
      remaining: state.remaining.filter((id) => id !== companion),
      seen: [...state.seen!, companion],
    }
    const shown = [first, companion]
    for (let index = 0; index < 2; index += 1) {
      state = nextSlide({...state, ids, mode})
      shown.push(state.current!)
    }
    expect(new Set(shown).size).toBe(4)
    expect(ids).toContain(nextSlide({...state, ids, mode}).current)
  },
)

it('should randomize an unseen queue inherited from sequential playback', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const slide = nextSlide({
    current: 'a',
    ids: ['a', 'b', 'c', 'd'],
    mode: 'random',
    remaining: ['b', 'c', 'd'],
    remainingMode: 'sequential',
    seen: ['a'],
  })
  expect(slide.current).toBe('c')
  expect(slide.seen).toEqual(['a', 'c'])
})

it('should restore catalog order when a random queue switches to sequential playback', () => {
  const slide = nextSlide({
    current: 'a',
    ids: ['a', 'b', 'c', 'd'],
    mode: 'sequential',
    remaining: ['d', 'b', 'c'],
    remainingMode: 'random',
    seen: ['a'],
  })

  expect(slide).toMatchObject({current: 'b', remaining: ['c', 'd']})
})

it('should reconcile deleted, seen, duplicated and newly added ids without changing queue order', () => {
  const slide = nextSlide({
    current: 'a',
    ids: ['a', 'b', 'c', 'd', 'e'],
    mode: 'sequential',
    remaining: ['deleted', 'd', 'd', 'a', 'b'],
    seen: ['deleted', 'a', 'a'],
  })

  expect(slide).toEqual({
    current: 'd',
    remaining: ['b', 'c', 'e'],
    remainingMode: 'sequential',
    seen: ['a', 'd'],
  })
})

it('should reset the seen cycle only after every surviving item has been seen', () => {
  expect(
    nextSlide({
      current: 'b',
      ids: ['a', 'b'],
      mode: 'sequential',
      remaining: ['deleted', 'a'],
      seen: ['deleted', 'b', 'a', 'a'],
    }),
  ).toEqual({
    current: 'a',
    remaining: ['b'],
    remainingMode: 'sequential',
    seen: ['a'],
  })
})

it('should preserve catalog duplicates while removing duplicates inherited from the queue', () => {
  expect(
    nextSlide({
      current: null,
      ids: ['a', 'a', 'b', 'b'],
      mode: 'sequential',
      remaining: ['b', 'b'],
    }),
  ).toEqual({
    current: 'b',
    remaining: ['a', 'a'],
    remainingMode: 'sequential',
    seen: ['b'],
  })
})

it('should restore catalog order including duplicates when switching modes', () => {
  expect(
    nextSlide({
      current: 'a',
      ids: ['a', 'b', 'b', 'c'],
      mode: 'sequential',
      remaining: ['c', 'b', 'b'],
      remainingMode: 'random',
      seen: ['a'],
    }),
  ).toEqual({
    current: 'b',
    remaining: ['b', 'c'],
    remainingMode: 'sequential',
    seen: ['a', 'b'],
  })
})

it('should compare string ids exactly and leave caller-owned arrays unchanged', () => {
  const ids = Object.freeze(['A', 'a', 'é', 'e\u0301', '__proto__', ''])
  const remaining = Object.freeze(['__proto__', '__proto__', 'a', 'missing'])
  const seen = Object.freeze(['A', 'é', 'é'])

  expect(nextSlide({current: 'A', ids, mode: 'sequential', remaining, seen})).toEqual({
    current: '__proto__',
    remaining: ['a', 'e\u0301', ''],
    remainingMode: 'sequential',
    seen: ['A', 'é', '__proto__'],
  })
  expect(ids).toEqual(['A', 'a', 'é', 'e\u0301', '__proto__', ''])
  expect(remaining).toEqual(['__proto__', '__proto__', 'a', 'missing'])
  expect(seen).toEqual(['A', 'é', 'é'])
})

it('should distinguish an explicit empty seen cycle from the current-item fallback', () => {
  const options = {current: 'a', ids: ['a', 'b'], mode: 'sequential' as const, remaining: []}
  expect(nextSlide(options)).toMatchObject({current: 'b', remaining: []})
  expect(nextSlide({...options, seen: []})).toMatchObject({current: 'a', remaining: ['b']})
})
