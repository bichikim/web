import {expect, test} from 'vitest'
import {applyStackedExpressionLayers} from '../apply-stacked-expression-layers'
import type {PuppetParameter} from '../../document'
import type {ExpressionLayer} from '../expression-playback'
const parameters: ReadonlyArray<PuppetParameter> = [
  {defaultValue: 2, id: 'p', maximum: 100, minimum: -100, name: 'P'},
]
const layer = (
  blend: 'add' | 'multiply' | 'overwrite',
  value: number,
  weight = 1,
): ExpressionLayer => ({
  expression: {id: blend, parameters: [{blend, parameterId: 'p', value}]},
  weight,
})
test('should apply all multipliers before adding independent expression offsets', () => {
  expect(
    applyStackedExpressionLayers(parameters, {}, [
      layer('add', 3),
      layer('multiply', 2),
      layer('multiply', 0.5),
    ]),
  ).toEqual({p: 5})
  expect(
    applyStackedExpressionLayers(parameters, {}, [
      layer('overwrite', 10),
      layer('add', 4, 0.5),
      layer('multiply', 3, 0.5),
    ]),
  ).toEqual({p: 22})
})
test('should restore the previous overwrite while the latest activation fades out', () => {
  expect(
    applyStackedExpressionLayers(parameters, {}, [
      layer('overwrite', 8),
      layer('overwrite', 4, 0.5),
    ]),
  ).toEqual({p: 6})
  expect(
    applyStackedExpressionLayers(parameters, {p: 5}, [
      {expression: {id: 'other', parameters: []}, weight: 1},
    ]),
  ).toEqual({p: 5})
})
