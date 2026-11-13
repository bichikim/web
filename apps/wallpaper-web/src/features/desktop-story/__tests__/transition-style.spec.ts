import {expect, test} from 'vitest'
import {getStoryTransitionStyle} from '../transition-style'

test('should give each feature chapter a distinct transition and repeat the opening at the download', () => {
  expect(getStoryTransitionStyle({from: -1, to: 0})).toBe('diagonal')
  expect(getStoryTransitionStyle({from: 0, to: 1})).toBe('bands')
  expect(getStoryTransitionStyle({from: 1, to: 2})).toBe('split')
  expect(getStoryTransitionStyle({from: 2, to: 3})).toBe('iris')
  expect(getStoryTransitionStyle({from: 3, to: 4})).toBe('split')
  expect(getStoryTransitionStyle({from: 4, to: 5})).toBe('diagonal')
})

test('should keep the same visual transition when crossing a chapter boundary in reverse', () => {
  expect(getStoryTransitionStyle({from: 1, to: 0})).toBe('bands')
  expect(getStoryTransitionStyle({from: 2, to: 1})).toBe('split')
  expect(getStoryTransitionStyle({from: 3, to: 2})).toBe('iris')
  expect(getStoryTransitionStyle({from: 0, to: -1})).toBe('diagonal')
})

test('should select the destination boundary when skipping chapters without requiring a queue', () => {
  expect(getStoryTransitionStyle({from: -1, to: 3})).toBe('iris')
  expect(getStoryTransitionStyle({from: 3, to: -1})).toBe('iris')
})
