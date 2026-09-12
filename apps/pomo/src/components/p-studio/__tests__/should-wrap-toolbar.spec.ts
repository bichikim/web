import {expect, it} from 'vitest'
import {shouldWrapToolbar} from '../should-wrap-toolbar'

it.each([
  {availableWidth: 148, expected: false},
  {availableWidth: 147.5, expected: true},
  {availableWidth: 149, expected: false},
])('should compare required width with $availableWidth available', ({availableWidth, expected}) => {
  expect(shouldWrapToolbar({availableWidth, controlWidths: [44, 44, 44], gap: 8})).toBe(expected)
})

it('should exclude hidden controls from widths and gaps', () => {
  expect(shouldWrapToolbar({availableWidth: 96, controlWidths: [44, 0, 44], gap: 8})).toBe(false)
})

it('should require no gaps for an empty toolbar or a single control', () => {
  expect(shouldWrapToolbar({availableWidth: 0, controlWidths: [], gap: 8})).toBe(false)
  expect(shouldWrapToolbar({availableWidth: 44, controlWidths: [44], gap: 8})).toBe(false)
})
