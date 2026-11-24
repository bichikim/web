import {expect, test} from 'vitest'
import {createFacePose} from '../face-pose'

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 25, -10, -60, 1]
const category = (categoryName: string, score: number) => ({categoryName, score})

test('should ignore translation and scale when reading a neutral face', () => {
  const matrix = identity.map((value, index) => (index < 12 ? value * 2 : value))
  expect(createFacePose(matrix, [])).toEqual({eyes: {x: 0, y: 0}, head: {x: 0, y: 0, z: 0}})
})

test('should extract mirrored yaw pitch and roll from column-major matrices', () => {
  const angle = Math.PI / 6
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const yaw = [cosine, 0, -sine, 0, 0, 1, 0, 0, sine, 0, cosine, 0, 0, 0, -60, 1]
  const pitch = [1, 0, 0, 0, 0, cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, -60, 1]
  const roll = [cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1, 0, 0, 0, -60, 1]
  expect(createFacePose(yaw, [])?.head.x).toBeCloseTo(-1)
  expect(createFacePose(pitch, [])?.head.y).toBeCloseTo(-1)
  expect(createFacePose(roll, [])?.head.z).toBeCloseTo(-1)
})

test('should track eye direction independently and suppress closed-eye estimates', () => {
  const categories = [
    category('eyeLookOutLeft', 0.8),
    category('eyeLookInRight', 0.6),
    category('eyeLookUpLeft', 0.4),
    category('eyeLookUpRight', 0.2),
  ]
  expect(createFacePose(identity, categories)?.eyes).toEqual({x: -0.7, y: expect.closeTo(0.3)})
  expect(
    createFacePose(identity, [
      ...categories,
      category('eyeBlinkLeft', 1),
      category('eyeBlinkRight', 1),
    ])?.eyes,
  ).toEqual({x: 0, y: 0})
})

test('should reject missing nonfinite or degenerate pose data', () => {
  expect(createFacePose([], [])).toBeNull()
  expect(
    createFacePose(
      identity.map(() => 0),
      [],
    ),
  ).toBeNull()
  expect(createFacePose([...identity.slice(0, 15), NaN], [])).toBeNull()
})
