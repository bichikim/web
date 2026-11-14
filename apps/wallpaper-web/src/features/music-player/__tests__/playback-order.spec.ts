import {expect, test} from 'vitest'
import {shuffleTrackOrder} from '../playback-order'

test('should include every track once in a random playback round', () => {
  const order = shuffleTrackOrder({ids: ['a', 'b', 'c', 'd'], random: () => 0})
  expect([...order].sort()).toEqual(['a', 'b', 'c', 'd'])
  expect(order).not.toEqual(['a', 'b', 'c', 'd'])
})

test('should avoid repeating the last track immediately across playback rounds', () => {
  const order = shuffleTrackOrder({ids: ['a', 'b', 'c'], previous: 'b', random: () => 0})
  expect(order[0]).not.toBe('b')
  expect([...order].sort()).toEqual(['a', 'b', 'c'])
})

test('should handle an empty library and continuously repeat a single track', () => {
  expect(shuffleTrackOrder({ids: [], random: () => 0})).toEqual([])
  expect(shuffleTrackOrder({ids: ['a'], previous: 'a', random: () => 0})).toEqual(['a'])
})
