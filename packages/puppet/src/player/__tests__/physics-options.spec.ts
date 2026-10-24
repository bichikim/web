import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPhysicsChain,
} from '../document'
import {evaluatePhysics} from '../internal/physics'
import {
  applyPhysicsOptions,
  isValidPhysicsOptions,
  type PuppetPhysicsOptions,
} from '../physics-options'

const range = {center: 0, maximum: 10, minimum: -10}
const STEP = 1 / 60
const SECOND = 60

const chain: PuppetPhysicsChain = {
  id: 'hair',
  inputs: [{axis: 'x', parameterId: 'head-x', weight: 1}],
  normalization: {angle: range, position: range},
  outputs: [
    {axis: 'angle', parameterId: 'hair-swing', pendulumIndex: 0, scale: 1, weight: 1},
    {axis: 'x', parameterId: 'hair-tip', pendulumIndex: 0, scale: 0.5, weight: 1},
  ],
  pendulums: [{acceleration: 1, length: 10, mobility: 0.9, reaction: 1}],
}

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'head-x', maximum: 10, minimum: -10, name: 'Head X'},
    {defaultValue: 0, id: 'hair-swing', maximum: 90, minimum: -90, name: 'Hair swing'},
    {defaultValue: 0, id: 'hair-tip', maximum: 10, minimum: -10, name: 'Hair tip'},
  ],
  parts: [],
  physics: {chains: [chain], pendulums: [], wind: [0.5, 0]},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

const settle = (physicsOptions?: PuppetPhysicsOptions) =>
  evaluatePhysics({
    deltaTime: 0,
    document,
    parameterValues: {},
    physicsOptions,
    physicsState: new Map(),
    settle: true,
  })

/** `frames` steps from the document's rest pose with `physicsOptions` applied from the start. */
const simulate = (physicsOptions: PuppetPhysicsOptions | undefined, frames: number) => {
  let result = settle()
  const history: Array<Readonly<Record<string, number>>> = []
  for (let frame = 0; frame < frames; frame += 1) {
    result = evaluatePhysics({
      chainState: result.chainState,
      deltaTime: STEP,
      document,
      parameterValues: {},
      physicsOptions,
      physicsState: result.physicsState,
    })
    history.push(result.parameterValues)
  }
  return history
}

describe('physics options', () => {
  test('should accept finite vectors with a gravity direction', () => {
    expect(isValidPhysicsOptions({})).toBe(true)
    expect(isValidPhysicsOptions({gravity: [0, -1], wind: [0, 0]})).toBe(true)
    expect(isValidPhysicsOptions({gravity: [0, 0]})).toBe(false)
    expect(isValidPhysicsOptions({wind: [Number.POSITIVE_INFINITY, 0]})).toBe(false)
  })

  test('should replace only the values it sets', () => {
    expect(applyPhysicsOptions(document.physics, undefined)).toBe(document.physics)
    expect(applyPhysicsOptions(document.physics, {gravity: [1, 0]})).toEqual({
      ...document.physics,
      gravity: [1, 0],
    })
    expect(applyPhysicsOptions(undefined, {wind: [1, 0]})).toBeUndefined()
  })

  test('should hang chains in the app wind instead of the document wind', () => {
    const own = settle().parameterValues
    expect(settle({}).parameterValues).toEqual(own)
    const calm = settle({wind: [0, 0]}).parameterValues
    const gusty = settle({wind: [2, 0]}).parameterValues
    // Wind toward +x pushes the end point that way, more for a stronger wind.
    expect(calm['hair-tip']).toBeCloseTo(0)
    expect(own['hair-tip']).toBeGreaterThan(0)
    expect(gusty['hair-tip']).toBeGreaterThan(own['hair-tip']!)
  })

  test('should swing toward a turned gravity and come to rest along it', () => {
    const turned = {gravity: [1, 2], wind: [0, 0]} as const
    const history = simulate(turned, 3 * SECOND)
    const rest = settle(turned).parameterValues
    // Angle outputs are measured from gravity, so only the swing toward it shows.
    expect(Math.max(...history.map((values) => Math.abs(values['hair-swing']!)))).toBeGreaterThan(
      0.3,
    )
    expect(history.at(-1)!['hair-swing']).toBeCloseTo(rest['hair-swing']!, 1)
    expect(history.at(-1)!['hair-tip']).toBeCloseTo(rest['hair-tip']!, 1)
    expect(rest['hair-tip']).not.toBeCloseTo(settle({wind: [0, 0]}).parameterValues['hair-tip']!)
  })
})
