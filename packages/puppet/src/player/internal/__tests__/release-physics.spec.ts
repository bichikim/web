import {expect, test} from 'vitest'
import {puppetDocument} from '../../__tests__/fixtures/document'
import type {PuppetPhysicsChain} from '../../document'
import {evaluatePhysics} from '../physics'
import {releasePhysics} from '../release-physics'

const parameter = (id: string) => ({defaultValue: 0, id, maximum: 30, minimum: -30, name: id})
const chain: PuppetPhysicsChain = {
  id: 'tail',
  inputs: [],
  normalization: {
    angle: {center: 0, maximum: 30, minimum: -30},
    position: {center: 0, maximum: 10, minimum: -10},
  },
  outputs: [
    {axis: 'angle', parameterId: 'root', pendulumIndex: 0, scale: 30, weight: 1},
    {axis: 'angle', parameterId: 'tip', pendulumIndex: 1, reflect: true, scale: 7, weight: 0.5},
  ],
  pendulums: [
    {acceleration: 1.2, length: 10, mobility: 0.9, reaction: 0.7},
    {acceleration: 0.75, length: 8, mobility: 0.95, reaction: 1},
  ],
}
const document = {
  ...puppetDocument,
  parameters: ['root', 'tip', 'plain', 'unrelated'].map(parameter),
  physics: {
    chains: [
      chain,
      {...chain, id: 'other', outputs: [{...chain.outputs[0]!, parameterId: 'unrelated'}]},
    ],
    pendulums: [],
  },
}

test('should release a held pose into authored chains without a jump or changing another chain', () => {
  const baseValues = {tip: 2}
  const initial = evaluatePhysics({
    deltaTime: 0,
    document,
    parameterValues: baseValues,
    physicsState: new Map(),
  })
  const held = {plain: 9, root: 12, tip: -0.4}
  const released = releasePhysics({...initial, baseValues, document, values: held})
  expect(released.parameterIds).toEqual(['root', 'tip'])
  expect(released.chainState.chains.get('other')).toBe(initial.chainState.chains.get('other'))
  let state = evaluatePhysics({...released, deltaTime: 0, document, parameterValues: baseValues})
  expect(state.parameterValues.root).toBeCloseTo(held.root)
  expect(state.parameterValues.tip).toBeCloseTo(held.tip)
  const history: number[] = []
  for (let frame = 0; frame < 600; frame += 1) {
    state = evaluatePhysics({...state, deltaTime: 1 / 60, document, parameterValues: baseValues})
    history.push(state.parameterValues.root!)
  }
  expect(Math.min(...history)).toBeLessThan(-1)
  expect(Math.abs(history.at(-1)!)).toBeLessThan(0.01)
})

test('should invert positional outputs without stretching the model pendulum', () => {
  const positional = {
    ...document,
    physics: {
      ...document.physics,
      chains: [
        {
          ...chain,
          outputs: [
            {axis: 'x' as const, parameterId: 'root', pendulumIndex: 0, scale: 2, weight: 1},
          ],
        },
      ],
    },
  }
  const initial = evaluatePhysics({
    deltaTime: 0,
    document: positional,
    parameterValues: {},
    physicsState: new Map(),
  })
  const released = releasePhysics({
    ...initial,
    baseValues: {},
    document: positional,
    values: {root: 8},
  })
  const state = evaluatePhysics({
    ...released,
    deltaTime: 0,
    document: positional,
    parameterValues: {},
  })
  expect(state.parameterValues.root).toBeCloseTo(8)
  const position = state.chainState.chains.get('tail')!.pendulums[0]!.position
  expect(Math.hypot(...position)).toBeCloseTo(10)
})

test.each(['position', 'lag'] as const)(
  'should release standalone %s physics from the displayed output',
  (outputMode) => {
    const standalone = {
      ...document,
      physics: {
        chains: [],
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'chest',
            inputParameterId: 'root',
            inputScale: 0.5,
            length: 1,
            outputMode,
            outputParameterId: 'tip',
            outputScale: 2,
          },
        ],
      },
    }
    const baseValues = {root: 2, tip: 3}
    const initial = evaluatePhysics({
      deltaTime: 0,
      document: standalone,
      parameterValues: baseValues,
      physicsState: new Map(),
      settle: true,
    })
    const released = releasePhysics({
      ...initial,
      baseValues,
      document: standalone,
      values: {plain: 2, tip: 8},
    })
    expect(released.parameterIds).toEqual(['tip'])
    let state = evaluatePhysics({
      ...released,
      deltaTime: 0,
      document: standalone,
      parameterValues: baseValues,
    })
    expect(state.parameterValues.tip).toBeCloseTo(8)
    for (let frame = 0; frame < 600; frame += 1) {
      state = evaluatePhysics({
        ...state,
        deltaTime: 1 / 60,
        document: standalone,
        parameterValues: baseValues,
      })
    }
    expect(state.parameterValues.tip).toBeCloseTo(outputMode === 'lag' ? 3 : 5, 1)
  },
)
