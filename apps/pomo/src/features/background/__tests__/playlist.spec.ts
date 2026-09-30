/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {nextSlide} from '../playlist'

afterEach(() => vi.restoreAllMocks())

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
