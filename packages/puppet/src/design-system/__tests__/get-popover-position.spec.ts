import {expect, test} from 'vitest'
import {getPopoverPosition} from '../get-popover-position'
test('should align below the trigger and flip above near the viewport bottom', () => {
  const options = {
    anchor: {bottom: 50, left: 100, top: 30},
    height: 200,
    viewport: {height: 600, width: 800},
    width: 250,
  }
  expect(getPopoverPosition(options)).toEqual({x: 100, y: 56})
  expect(getPopoverPosition({...options, anchor: {bottom: 590, left: 790, top: 570}})).toEqual({
    x: 538,
    y: 364,
  })
})
