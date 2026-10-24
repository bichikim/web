import {expect, test} from 'vitest'
import {modelParameters} from '../model-parameters'

const parameters = [
  {defaultValue: 0, id: 'custom-eye-y', maximum: 1, minimum: -1},
  {defaultValue: 0, id: 'custom-eye-x', maximum: 1, minimum: -1},
]
const parts = (y: number) => [{partId: 'eye', vertices: [0, y, 10, y]}]

test('should determine vertical direction from model keyforms at the other axis default', () => {
  const result = modelParameters({
    parameterBindings: [
      {
        id: 'eyes',
        keyforms: [
          {parts: parts(80), values: [-1, -1]},
          {parts: parts(90), values: [0, -1]},
          {parts: parts(100), values: [0, 0]},
          {parts: parts(120), values: [0, 1]},
          {parts: parts(70), values: [1, 1]},
        ],
        parameterIds: ['custom-eye-x', 'custom-eye-y'],
      },
    ],
    parameters,
  })
  expect(result.find((parameter) => parameter.id === 'custom-eye-y')?.positiveY).toBe('down')
})

test('should retain upward conventions and leave unknown or horizontal motion unspecified', () => {
  const result = modelParameters({
    parameterBindings: [
      {
        id: 'eyes',
        keyforms: [
          {parts: parts(120), values: [-1]},
          {parts: parts(100), values: [1]},
        ],
        parameterIds: ['custom-eye-y'],
      },
    ],
    parameters,
  })
  expect(result[0]?.positiveY).toBe('up')
  expect(result[1]?.positiveY).toBeUndefined()
  expect(modelParameters({parameters})[0]?.positiveY).toBeUndefined()
})
