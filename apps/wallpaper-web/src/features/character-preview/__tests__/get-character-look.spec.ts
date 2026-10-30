import {expect, test} from 'vitest'
import {getCharacterLook} from '../get-character-look'
import geometry from '../../../data/character-look.json'

const viewport = {height: 800, width: 1000}
const bounds = {height: 600, width: 480, x: 100, y: 50}
const face = {x: bounds.x + geometry.face.x / 10, y: bounds.y + geometry.face.y / 10}

test('should center on the face rather than the canvas or viewport center', () => {
  expect(getCharacterLook({bounds, pointer: face, viewport})).toEqual({x: 0, y: 0})
  const right = getCharacterLook({bounds, pointer: {x: face.x + 100, y: face.y}, viewport})
  expect(right.x).toBeCloseTo(0.2)
  expect(right.y).toBe(0)
  const below = getCharacterLook({bounds, pointer: {x: face.x, y: face.y + 80}, viewport})
  expect(below.x).toBe(0)
  expect(below.y).toBeCloseTo(-0.2)
})

test('should preserve the same direction after dragging and scale the face origin with the character', () => {
  const pointer = {x: face.x + 100, y: face.y - 80}
  const before = getCharacterLook({bounds, pointer, viewport})
  expect(
    getCharacterLook({
      bounds: {...bounds, x: 300, y: 150},
      pointer: {x: pointer.x + 200, y: pointer.y + 100},
      viewport,
    }),
  ).toEqual(before)
  const enlarged = {height: 1200, width: 960, x: 100, y: 50}
  const largerFace = {x: enlarged.x + geometry.face.x / 5, y: enlarged.y + geometry.face.y / 5}
  expect(getCharacterLook({bounds: enlarged, pointer: largerFace, viewport})).toEqual({x: 0, y: 0})
})

test('should account for letterboxing and the miniature expression without narrowing viewport tracking', () => {
  const letterbox = {height: 600, width: 680, x: 0, y: 0}
  expect(
    getCharacterLook({
      bounds: letterbox,
      pointer: {x: geometry.face.x / 10 + 100, y: geometry.face.y / 10},
      viewport,
    }),
  ).toEqual({x: 0, y: 0})
  const miniature = {
    x: bounds.x + geometry.miniatureFace.x / 10,
    y: bounds.y + geometry.miniatureFace.y / 10,
  }
  expect(getCharacterLook({bounds, miniature: 1, pointer: miniature, viewport})).toEqual({
    x: 0,
    y: 0,
  })
  expect(
    getCharacterLook({bounds, pointer: {x: face.x + 1000, y: face.y - 800}, viewport}),
  ).toEqual({x: 1, y: 1})
  expect(getCharacterLook({bounds: {...bounds, width: 0}, pointer: face, viewport})).toEqual({
    x: 0,
    y: 0,
  })
})
