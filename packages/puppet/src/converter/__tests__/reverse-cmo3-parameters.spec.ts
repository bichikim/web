import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player/create-demo-document'
import {composeParameterVertices} from '../../deformation/composition'
import {reverseCmo3Parameters} from '../reverse-cmo3-parameters'

test('should reflect only the selected source axis before SDK motions are attached', () => {
  const source = createDemoDocument()
  const part = source.parts[0]!
  const reversed = reverseCmo3Parameters(source, ['angle-x'])
  const sample = (document: typeof source, x: number) =>
    composeParameterVertices({
      document,
      parameterValues: {'angle-x': x, 'angle-y': 5},
      partId: part.id,
      restVertices: part.mesh.vertices,
    })
  const expected = sample(source, 15)
  sample(reversed, -15).forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(expected[index]!, 9),
  )
  expect(reversed.motions).toEqual(source.motions)
  expect(() => reverseCmo3Parameters(source, ['missing'])).toThrow('known parameter IDs')
})
