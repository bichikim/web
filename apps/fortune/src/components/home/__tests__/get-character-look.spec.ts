import {describe, expect, it} from 'vitest'
import {getCharacterLook} from '../get-character-look'

describe('getCharacterLook', () => {
  const bounds = {height: 600, left: 100, top: 50, width: 480}

  it('should look straight ahead when the pointer is over the face', () => {
    expect(getCharacterLook(bounds, {clientX: 340, clientY: 143.884641})).toEqual({x: 0, y: 0})
  })

  it('should track the pointer direction and limit distant targets', () => {
    const target = getCharacterLook(bounds, {clientX: 1000, clientY: -500})
    expect(target).toEqual({x: 1, y: 1})
    const opposite = getCharacterLook(bounds, {clientX: -1000, clientY: 1000})
    expect(opposite).toEqual({x: -1, y: -1})
  })

  it('should account for letterboxing in a wide character frame', () => {
    expect(getCharacterLook({...bounds, width: 960}, {clientX: 580, clientY: 143.884641})).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('should use the model layout when it includes space above the head', () => {
    const layout = {height: 6500, width: 4800, x: 0, y: -500}
    const target = getCharacterLook(
      {height: 650, left: 100, top: 50, width: 480},
      {clientX: 340, clientY: 193.884641},
      layout,
    )
    expect(target.x).toBeCloseTo(0)
    expect(target.y).toBeCloseTo(0)
  })

  it('should return to the center when the frame has no size', () => {
    expect(getCharacterLook({...bounds, height: 0}, {clientX: 1000, clientY: -500})).toEqual({
      x: 0,
      y: 0,
    })
  })
})
