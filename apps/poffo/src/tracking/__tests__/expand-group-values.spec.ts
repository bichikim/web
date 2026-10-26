import {expect, test} from 'vitest'
import {expandGroupValues} from '../expand-group-values'
const parameters = [
  {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
  {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
]
test('should distribute normalized group values over each member range and reject individual overrides', () => {
  const groups = [
    {id: 'face', mode: 'broadcast' as const, name: 'Face', parameterIds: ['angle', 'mouth']},
  ]
  expect(expandGroupValues({groups, parameters, values: {'group:face': 0.75}})).toEqual({
    angle: 15,
    mouth: 0.75,
  })
  expect(expandGroupValues({groups, parameters, values: {'group:face': 0.75, mouth: 0.2}})).toEqual(
    {angle: 15, mouth: 0.75},
  )
})
test('should leave folder groups inert and omit synthetic values from player output', () => {
  expect(
    expandGroupValues({
      groups: [{id: 'face', mode: 'folder', name: 'Face', parameterIds: ['angle', 'mouth']}],
      parameters,
      values: {'group:face': 1, mouth: 0.4},
    }),
  ).toEqual({mouth: 0.4})
})

test('should ignore individual inputs when a broadcast group has no incoming value', () => {
  expect(
    expandGroupValues({
      groups: [{id: 'face', mode: 'broadcast', name: 'Face', parameterIds: ['mouth']}],
      parameters,
      values: {angle: 10, mouth: 1},
    }),
  ).toEqual({angle: 10})
})
