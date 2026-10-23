import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPhysics,
  type PuppetPhysicsChain,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {evaluatePhysics} from '../physics'

const range = {center: 0, maximum: 10, minimum: -10}

const chain: PuppetPhysicsChain = {
  id: 'hair',
  inputs: [
    {axis: 'x', parameterId: 'head-x', weight: 1},
    {axis: 'angle', parameterId: 'head-angle', weight: 1},
  ],
  normalization: {angle: range, position: range},
  outputs: [
    {axis: 'angle', parameterId: 'hair-swing', pendulumIndex: 0, scale: 1, weight: 1},
    {axis: 'x', parameterId: 'hair-tip', pendulumIndex: 1, reflect: true, scale: 10, weight: 0.5},
  ],
  pendulums: [
    {acceleration: 1, length: 10, mobility: 0.9, reaction: 1},
    {acceleration: 1, length: 5, mobility: 0.9, reaction: 1},
  ],
}

const createDocument = (physics: Partial<PuppetPhysics> = {}): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'head-x', maximum: 10, minimum: -10, name: 'Head X'},
    {defaultValue: 0, id: 'head-angle', maximum: 30, minimum: -30, name: 'Head angle'},
    {defaultValue: 0, id: 'hair-swing', maximum: 90, minimum: -90, name: 'Hair swing'},
    {defaultValue: 0, id: 'hair-tip', maximum: 10, minimum: -10, name: 'Hair tip'},
  ],
  parts: [],
  physics: {chains: [chain], pendulums: [], ...physics},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

/** Runs `frames` steps of 1/60 s from a still chain with fixed inputs. */
const simulate = (
  document: PuppetDocument,
  parameterValues: Readonly<Record<string, number>>,
  frames: number,
) => {
  let result = evaluatePhysics({
    deltaTime: 0,
    document,
    parameterValues: {},
    physicsState: new Map(),
  })
  const history: Array<Readonly<Record<string, number>>> = []
  for (let frame = 0; frame < frames; frame += 1) {
    result = evaluatePhysics({
      chainState: result.chainState,
      deltaTime: 1 / 60,
      document,
      parameterValues,
      physicsState: result.physicsState,
    })
    history.push(result.parameterValues)
  }
  return history
}

const settle = (document: PuppetDocument, parameterValues: Readonly<Record<string, number>>) =>
  evaluatePhysics({
    deltaTime: 0,
    document,
    parameterValues,
    physicsState: new Map(),
    settle: true,
  }).parameterValues

test('should preserve a Cubism normalization center outside equal endpoints', () => {
  const document = createDocument({
    chains: [
      {
        ...chain,
        normalization: {
          angle: {center: 90, maximum: -90, minimum: -90},
          position: {center: 0, maximum: -10, minimum: -10},
        },
      },
    ],
  })
  expect(parseDocumentValue(document).ok).toBe(true)
  expect(Object.values(settle(document, {'head-angle': 15})).every(Number.isFinite)).toBe(true)
})

describe('physics chains', () => {
  test('should hang along gravity turned by the tilt input', () => {
    // 15 of 30 maps to 5 of 10 normalized degrees, negated as in Cubism: gravity turns so the
    // first pendulum reads +5° (in radians) from straight down.
    expect(settle(createDocument(), {'head-angle': 15})['hair-swing']).toBeCloseTo(Math.PI / 36)
  })

  test('should swing after a moving root and settle back', () => {
    const history = simulate(createDocument(), {'head-x': 10}, 240)
    expect(Math.abs(history[5]?.['hair-swing'] ?? 0)).toBeGreaterThan(0.1)
    expect(Math.abs(history.at(-1)?.['hair-swing'] ?? Number.NaN)).toBeLessThan(0.01)
  })

  test('should lean steadily with the wind', () => {
    const history = simulate(createDocument({wind: [1, 0]}), {}, 600)
    // Equal sideways and downward pulls: 45° toward +x, a negative angle from straight down.
    expect(history.at(-1)?.['hair-swing']).toBeCloseTo(-Math.PI / 4, 3)
  })

  test('should step at the physics rate and blend outputs between steps', () => {
    const document = createDocument({fps: 30})
    const start = (values: Readonly<Record<string, number>>) =>
      evaluatePhysics({deltaTime: 0, document, parameterValues: values, physicsState: new Map()})
    const advance = (
      from: ReturnType<typeof evaluatePhysics>,
      deltaTime: number,
    ): ReturnType<typeof evaluatePhysics> =>
      evaluatePhysics({
        chainState: from.chainState,
        deltaTime,
        document,
        parameterValues: {'head-x': 10},
        physicsState: from.physicsState,
      })
    const halves = advance(advance(start({}), 1 / 60), 1 / 60)
    const whole = advance(start({}), 1 / 30)
    expect(halves.parameterValues['hair-swing']).toBeCloseTo(
      whole.parameterValues['hair-swing']!,
      9,
    )
    // A paused frame keeps the blended outputs.
    expect(advance(halves, 0).parameterValues).toEqual(halves.parameterValues)
  })

  test('should fix Cubism defects: X/Y outputs scale and inputs center on the default', () => {
    const offset: PuppetPhysicsChain = {
      ...chain,
      inputs: [{axis: 'x', parameterId: 'head-x', weight: 1}],
      outputs: [{axis: 'y', parameterId: 'hair-tip', pendulumIndex: 0, scale: 0.5, weight: 1}],
    }
    // The first pendulum hangs 10 below the root: half of it (Cubism always wrote 0).
    expect(settle(createDocument({chains: [offset]}), {})['hair-tip']).toBeCloseTo(5)
    const lopsided = {
      ...createDocument({chains: [chain]}),
      parameters: (createDocument().parameters ?? []).map((parameter) =>
        parameter.id === 'head-angle' ? {...parameter, maximum: 30, minimum: 0} : parameter,
      ),
    }
    // At its default the tilt input leaves gravity straight (Cubism centered on 15, tilting it).
    expect(settle(lopsided, {'head-angle': 0})['hair-swing']).toBe(0)
    expect(settle(lopsided, {'head-angle': 15})['hair-swing']).not.toBe(0)
  })

  test('should reject chains whose output feeds their own input or bad settings', () => {
    expect(parseDocumentValue(createDocument()).ok).toBe(true)
    const feedback = {
      ...chain,
      outputs: [{...chain.outputs[0]!, parameterId: 'head-x'}],
    }
    expect(parseDocumentValue(createDocument({chains: [feedback]})).ok).toBe(false)
    const loose = {...chain, pendulums: [{...chain.pendulums[0]!, mobility: 1.5}]}
    expect(parseDocumentValue(createDocument({chains: [loose]})).ok).toBe(false)
    expect(parseDocumentValue(createDocument({gravity: [0, 0]})).ok).toBe(false)
  })
})

test('should use each frame duration when chain fps is zero', () => {
  const frameTime = createDocument({fps: 0})
  expect(parseDocumentValue(frameTime).ok).toBe(true)
  const run = (document: PuppetDocument) => {
    const start = evaluatePhysics({
      deltaTime: 0,
      document,
      parameterValues: {},
      physicsState: new Map(),
    })
    const first = evaluatePhysics({
      chainState: start.chainState,
      deltaTime: 1 / 30,
      document,
      parameterValues: {'head-x': 10},
      physicsState: start.physicsState,
    })
    return evaluatePhysics({
      chainState: first.chainState,
      deltaTime: 1 / 30,
      document,
      parameterValues: {'head-x': 10},
      physicsState: first.physicsState,
    })
  }
  expect(run(frameTime).parameterValues).toEqual(run(createDocument({fps: 30})).parameterValues)
  expect(run(frameTime).parameterValues).not.toEqual(run(createDocument({fps: 60})).parameterValues)
})
