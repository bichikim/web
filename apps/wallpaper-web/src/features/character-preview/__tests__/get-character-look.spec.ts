import {expect, test} from 'vitest'
import {getCharacterLook} from '../get-character-look'
import geometry from '../../../data/character-look.json'

const bounds = {height: 600, width: 480, x: 100, y: 50}
const face = {x: bounds.x + geometry.face.x / 10, y: bounds.y + geometry.face.y / 10}

test('should center on the face rather than the canvas or viewport center', () => {
  expect(getCharacterLook({bounds, pointer: face})).toEqual({x: 0, y: 0})
  const right = getCharacterLook({bounds, pointer: {x: face.x + 100, y: face.y}})
  expect(right.x).toBeCloseTo(0.326511475)
  expect(right.y).toBe(0)
  const below = getCharacterLook({bounds, pointer: {x: face.x, y: face.y + 80}})
  expect(below.x).toBe(0)
  expect(below.y).toBeCloseTo(-0.2681931641)
})

test('should preserve the same direction after dragging and scale the face origin with the character', () => {
  const pointer = {x: face.x + 100, y: face.y - 80}
  const before = getCharacterLook({bounds, pointer})
  expect(
    getCharacterLook({
      bounds: {...bounds, x: 300, y: 150},
      pointer: {x: pointer.x + 200, y: pointer.y + 100},
    }),
  ).toEqual(before)
  const enlarged = {height: 1200, width: 960, x: 100, y: 50}
  const largerFace = {x: enlarged.x + geometry.face.x / 5, y: enlarged.y + geometry.face.y / 5}
  expect(getCharacterLook({bounds: enlarged, pointer: largerFace})).toEqual({x: 0, y: 0})
})

test('should account for letterboxing and the miniature expression using fitted character height for distance', () => {
  const letterbox = {height: 600, width: 680, x: 0, y: 0}
  expect(
    getCharacterLook({
      bounds: letterbox,
      pointer: {x: geometry.face.x / 10 + 100, y: geometry.face.y / 10},
    }),
  ).toEqual({x: 0, y: 0})
  const miniature = {
    x: bounds.x + geometry.miniatureFace.x / 10,
    y: bounds.y + geometry.miniatureFace.y / 10,
  }
  expect(getCharacterLook({bounds, miniature: 1, pointer: miniature})).toEqual({
    x: 0,
    y: 0,
  })
  const diagonal = getCharacterLook({bounds, pointer: {x: face.x + 1000, y: face.y - 800}})
  expect(diagonal.x).toBeCloseTo(1000 / Math.hypot(1000, 800))
  expect(diagonal.y).toBeCloseTo(800 / Math.hypot(1000, 800))
  expect(getCharacterLook({bounds: {...bounds, width: 0}, pointer: face})).toEqual({
    x: 0,
    y: 0,
  })
})

test('should reach each axis maximum at one character height and preserve the desktop distance curve', () => {
  for (const [distance, expected] of [
    [0.125, 0.2529449604],
    [0.25, 0.4537597583],
    [0.5, 0.7248927762],
    [1, 1],
    [2, 1],
  ]) {
    expect(
      getCharacterLook({bounds, pointer: {x: face.x + bounds.height * distance!, y: face.y}}).x,
    ).toBeCloseTo(expected!, 8)
    expect(
      getCharacterLook({bounds, pointer: {x: face.x, y: face.y + bounds.height * distance!}}).y,
    ).toBeCloseTo(-expected!, 8)
  }
  const compact = {height: 300, width: 480, x: 100, y: 50}
  const compactFace = {
    x: compact.x + (compact.width - 240) / 2 + geometry.face.x / 20,
    y: compact.y + geometry.face.y / 20,
  }
  expect(
    getCharacterLook({bounds: compact, pointer: {x: compactFace.x + 300, y: compactFace.y}}),
  ).toEqual({x: 1, y: 0})
})
