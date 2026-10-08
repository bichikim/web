import {expect, test} from 'vitest'
import {reconcileTimelineKeyframes} from '../reconcile-timeline-keyframes'

const frame = (time: number) => ({easing: 'linear' as const, time})

test('should preserve moved marker identities when a batch overlaps its original times', () => {
  const previous = reconcileTimelineKeyframes({
    keyframes: [frame(0), frame(1), frame(3)],
    previous: [],
  })
  const next = reconcileTimelineKeyframes({
    keyframes: [frame(1), frame(2), frame(3)],
    moves: [
      {sourceTime: 0, targetTime: 1},
      {sourceTime: 1, targetTime: 2},
    ],
    previous,
  })
  expect(next.map((view) => view.key)).toEqual(previous.map((view) => view.key))
  expect(previous.map((view) => view.keyframe.time)).toEqual([0, 1, 3])
})

test('should allocate a new marker for insertion and retain remaining markers after deletion', () => {
  const previous = reconcileTimelineKeyframes({keyframes: [frame(0), frame(2)], previous: []})
  const inserted = reconcileTimelineKeyframes({keyframes: [frame(0), frame(1), frame(2)], previous})
  expect(inserted[0]?.key).toBe(previous[0]?.key)
  expect(inserted[2]?.key).toBe(previous[1]?.key)
  expect(inserted[1]?.key).not.toBe(previous[0]?.key)
  expect(inserted[1]?.key).not.toBe(previous[1]?.key)
  const removed = reconcileTimelineKeyframes({keyframes: [frame(1), frame(2)], previous: inserted})
  expect(removed.map((view) => view.key)).toEqual(inserted.slice(1).map((view) => view.key))
})

test('should retain distinct markers for duplicate times accepted by imported documents', () => {
  const previous = reconcileTimelineKeyframes({
    keyframes: [frame(0), frame(0), frame(2)],
    previous: [],
  })
  const next = reconcileTimelineKeyframes({keyframes: [frame(0), frame(0), frame(2)], previous})
  expect(next.map((view) => view.key)).toEqual(previous.map((view) => view.key))
  expect(new Set(next.map((view) => view.key)).size).toBe(3)
})
