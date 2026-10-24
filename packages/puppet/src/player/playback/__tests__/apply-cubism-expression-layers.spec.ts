import {expect, test} from 'vitest'
import {applyCubismExpressionLayers} from '../apply-cubism-expression-layers'
import type {PuppetExpression, PuppetParameter} from '../../document'
import type {ExpressionLayer} from '../expression-playback'

const parameters: ReadonlyArray<PuppetParameter> = ['add', 'multiply', 'overwrite', 'other'].map(
  (id) => ({defaultValue: 2, id, maximum: 10, minimum: -10, name: id}),
)
const expression: PuppetExpression = {
  composition: 'cubism',
  id: 'first',
  parameters: [
    {blend: 'add', parameterId: 'add', value: 4},
    {blend: 'multiply', parameterId: 'multiply', value: 3},
    {blend: 'overwrite', parameterId: 'overwrite', value: 8},
  ],
}

test('should apply SDK blend channels at a partial overall fade weight', () => {
  const layer: ExpressionLayer = {expression, fadeInWeight: 0.25, weight: 0.25}
  expect(applyCubismExpressionLayers(parameters, {}, [layer])).toEqual({
    add: 3,
    multiply: 3,
    other: 2,
    overwrite: 3.5,
  })
})

test('should interpolate outgoing channels toward an expression without those parameters', () => {
  const next: PuppetExpression = {composition: 'cubism', id: 'next', parameters: []}
  expect(
    applyCubismExpressionLayers(parameters, {}, [
      {expression, fadeInWeight: 1, weight: 0.5},
      {expression: next, fadeInWeight: 0.5, weight: 0.5},
    ]),
  ).toEqual({add: 4, multiply: 4, other: 2, overwrite: 2})
})

test('should apply overwrite and multiply channels across expression switches', () => {
  const next: PuppetExpression = {
    ...expression,
    id: 'next',
    parameters: [
      {blend: 'overwrite', parameterId: 'add', value: 6},
      {blend: 'multiply', parameterId: 'multiply', value: 0.5},
      {blend: 'overwrite', parameterId: 'overwrite', value: 6},
    ],
  }
  expect(
    applyCubismExpressionLayers(parameters, {}, [
      {expression, fadeInWeight: 1, weight: 0.75},
      {expression: next, fadeInWeight: 0.25, weight: 0.25},
    ]),
  ).toEqual({add: 6, multiply: 4.75, other: 2, overwrite: 3})
})
