import {describe, expect, it} from 'vitest'
import {getViewportLook} from '../get-viewport-look'

describe('getViewportLook', () => {
  const bounds = {height: 600, left: 100, top: 50, width: 1000}

  it('should look straight ahead at the viewport center', () => {
    expect(getViewportLook({bounds, pointer: {clientX: 600, clientY: 350}})).toEqual({x: 0, y: 0})
  })

  it.each([
    [100, 350, -1, 0],
    [1100, 350, 1, 0],
    [600, 50, 0, 1],
    [600, 650, 0, -1],
    [100, 50, -1, 1],
    [1100, 650, 1, -1],
    [1099, 649, 1, -1],
    [101, 51, -1, 1],
  ])('should reach the full range at screen edge (%s, %s)', (clientX, clientY, x, y) => {
    expect(getViewportLook({bounds, pointer: {clientX, clientY}})).toEqual({x, y})
  })

  it('should normalize each axis using its own screen dimension', () => {
    expect(getViewportLook({bounds, pointer: {clientX: 850, clientY: 200}})).toEqual({
      x: 0.5,
      y: 0.5,
    })
  })

  it('should clamp coordinates beyond the viewport', () => {
    expect(getViewportLook({bounds, pointer: {clientX: -500, clientY: 900}})).toEqual({
      x: -1,
      y: -1,
    })
  })

  it.each([
    {...bounds, width: 0},
    {...bounds, height: 0},
  ])('should return to the center for an empty viewport', (empty) => {
    expect(getViewportLook({bounds: empty, pointer: {clientX: 850, clientY: 200}})).toEqual({
      x: 0,
      y: 0,
    })
  })
})
