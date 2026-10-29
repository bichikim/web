import {expect, test} from 'vitest'
import {advanceStoryTransition, INITIAL_STORY} from '../transition'

test('should commit a chapter only after coverage and finish independently of further scrolling', () => {
  const covering = advanceStoryTransition(INITIAL_STORY, {chapter: 0, type: 'request'})
  expect(covering.chapter).toBe(-1)
  expect(covering.transition).toMatchObject({direction: 1, from: -1, phase: 'cover', to: 0})
  const revealing = advanceStoryTransition(covering, {revision: 1, type: 'covered'})
  expect(revealing.chapter).toBe(0)
  expect(revealing.transition?.phase).toBe('reveal')
  const finished = advanceStoryTransition(revealing, {revision: 1, type: 'finished'})
  expect(finished).toMatchObject({chapter: 0, requested: 0, transition: null})
  expect(advanceStoryTransition(finished, {chapter: 0, type: 'request'})).toBe(finished)
})

test('should discard scroll requests during both phases and accept fresh input after completion', () => {
  const covering = advanceStoryTransition(INITIAL_STORY, {chapter: 0, type: 'request'})
  const skipped = advanceStoryTransition(covering, {chapter: 3, type: 'request'})
  expect(skipped).toBe(covering)
  const revealing = advanceStoryTransition(skipped, {revision: 1, type: 'covered'})
  expect(advanceStoryTransition(revealing, {chapter: -1, type: 'request'})).toBe(revealing)
  const finished = advanceStoryTransition(revealing, {revision: 1, type: 'finished'})
  expect(finished).toMatchObject({chapter: 0, requested: 0, transition: null})
  const next = advanceStoryTransition(finished, {chapter: 4, type: 'request'})
  expect(next.transition).toMatchObject({from: 0, phase: 'cover', revision: 2, to: 4})
})

test('should reveal user control only after the reverse transition has finished', () => {
  const settled = {...INITIAL_STORY, chapter: 2, requested: 2}
  const covering = advanceStoryTransition(settled, {chapter: -1, type: 'request'})
  expect(covering.transition?.direction).toBe(-1)
  expect(covering.chapter).toBe(2)
  const revealing = advanceStoryTransition(covering, {revision: 1, type: 'covered'})
  expect(revealing).toMatchObject({chapter: -1, transition: {phase: 'reveal'}})
  expect(advanceStoryTransition(revealing, {revision: 1, type: 'finished'}).transition).toBeNull()
})

test('should ignore stale and out-of-order completion events', () => {
  const covering = advanceStoryTransition(INITIAL_STORY, {chapter: 1, type: 'request'})
  expect(advanceStoryTransition(covering, {revision: 1, type: 'finished'})).toBe(covering)
  expect(advanceStoryTransition(covering, {revision: 9, type: 'covered'})).toBe(covering)
  const revealing = advanceStoryTransition(covering, {revision: 1, type: 'covered'})
  expect(advanceStoryTransition(revealing, {revision: 1, type: 'covered'})).toBe(revealing)
})

test('should resolve immediately when reduced motion disables animation completion events', () => {
  const covering = advanceStoryTransition(INITIAL_STORY, {chapter: 0, type: 'request'})
  const reduced = advanceStoryTransition(covering, {
    chapter: 3,
    reducedMotion: true,
    type: 'request',
  })
  expect(reduced).toMatchObject({chapter: 3, requested: 3, transition: null})
  expect(advanceStoryTransition(reduced, {revision: 1, type: 'covered'})).toBe(reduced)
})
