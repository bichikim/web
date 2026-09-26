import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../create-demo-document'
import type {PuppetDocument} from '../../document'
import {createPhysicsState, evaluatePhysics} from '../physics'

const createPhysicsDocument = (outputMaximum = 30): PuppetDocument => ({
  ...createDemoDocument(),
  parameters: [
    {defaultValue: 0, id: 'input', maximum: 30, minimum: -30, name: 'Input'},
    {
      defaultValue: 0,
      id: 'output',
      maximum: outputMaximum,
      minimum: -outputMaximum,
      name: 'Output',
    },
  ],
  physics: {
    pendulums: [
      {
        damping: 1.2,
        gravity: 9.8,
        id: 'swing',
        inputParameterId: 'input',
        inputScale: 1,
        length: 1,
        outputParameterId: 'output',
        outputScale: 2,
      },
    ],
  },
})

describe('evaluatePhysics', () => {
  test('should settle at the current input without velocity or accumulated time', () => {
    const document = createPhysicsDocument()
    const result = evaluatePhysics({
      deltaTime: 1,
      document,
      parameterValues: {input: 5, output: 3},
      physicsState: new Map([['swing', {accumulator: 0.002, position: -20, velocity: 100}]]),
      settle: true,
    })
    expect(result.parameterValues.output).toBe(13)
    expect(result.physicsState.get('swing')).toEqual({accumulator: 0, position: 5, velocity: 0})
  })
  test('should add a pendulum displacement to the output parameter', () => {
    const document = createPhysicsDocument()

    const result = evaluatePhysics({
      deltaTime: 1 / 60,
      document,
      parameterValues: {input: 30, output: 0},
      physicsState: createPhysicsState(document),
    })

    expect(result.parameterValues.output).toBeGreaterThan(0)
    expect(result.physicsState.get('swing')?.position).toBeGreaterThan(0)
  })

  test('should trail a moving input, rebound past it, and settle without a permanent offset', () => {
    const baseDocument = createPhysicsDocument()
    const document: PuppetDocument = {
      ...baseDocument,
      physics: {
        pendulums: baseDocument.physics!.pendulums.map((pendulum) => ({
          ...pendulum,
          outputMode: 'lag',
        })),
      },
    }
    let physicsState = createPhysicsState(document)
    const sample = (input: number) => {
      const result = evaluatePhysics({
        deltaTime: 1 / 60,
        document,
        parameterValues: {input, output: 3},
        physicsState,
      })
      physicsState = result.physicsState
      return result.parameterValues.output!
    }

    expect(sample(5)).toBeLessThan(3)
    Array.from({length: 1200}, () => sample(5))
    expect(sample(5)).toBeCloseTo(3, 2)
    expect(sample(0)).toBeGreaterThan(3)
    Array.from({length: 1200}, () => sample(0))
    expect(sample(0)).toBeCloseTo(3, 2)

    const settled = evaluatePhysics({
      deltaTime: 0,
      document,
      parameterValues: {input: 5, output: 3},
      physicsState,
      settle: true,
    })
    expect(settled.parameterValues.output).toBe(3)
  })

  test('should clamp a physics output to its parameter range', () => {
    const document = createPhysicsDocument(1)

    const result = evaluatePhysics({
      deltaTime: 1,
      document,
      parameterValues: {input: 30, output: 0},
      physicsState: createPhysicsState(document),
    })

    expect(result.parameterValues.output).toBeLessThanOrEqual(1)
    expect(result.parameterValues.output).toBeGreaterThanOrEqual(-1)
  })

  test('should keep non-finite input scaling from poisoning physics output', () => {
    const document = createPhysicsDocument()
    const invalidPhysicsDocument: PuppetDocument = {
      ...document,
      physics: {
        pendulums: document.physics!.pendulums.map((pendulum) => ({
          ...pendulum,
          inputScale: Number.MAX_VALUE,
        })),
      },
    }

    const result = evaluatePhysics({
      deltaTime: 1 / 120,
      document: invalidPhysicsDocument,
      parameterValues: {input: 30, output: 0},
      physicsState: createPhysicsState(invalidPhysicsDocument),
    })

    expect(Number.isFinite(result.parameterValues.output ?? Number.NaN)).toBe(true)
    expect(Number.isFinite(result.physicsState.get('swing')?.position ?? Number.NaN)).toBe(true)
    expect(Number.isFinite(result.physicsState.get('swing')?.velocity ?? Number.NaN)).toBe(true)
  })

  test('should evaluate chained pendulums in document order', () => {
    const document: PuppetDocument = {
      ...createDemoDocument(),
      parameters: [
        {defaultValue: 0, id: 'input', maximum: 30, minimum: -30, name: 'Input'},
        {defaultValue: 0, id: 'middle', maximum: 30, minimum: -30, name: 'Middle'},
        {defaultValue: 0, id: 'output', maximum: 30, minimum: -30, name: 'Output'},
      ],
      physics: {
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'first',
            inputParameterId: 'input',
            inputScale: 1,
            length: 1,
            outputParameterId: 'middle',
            outputScale: 1,
          },
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'second',
            inputParameterId: 'middle',
            inputScale: 1,
            length: 1,
            outputParameterId: 'output',
            outputScale: 1,
          },
        ],
      },
    }

    const result = evaluatePhysics({
      deltaTime: 1 / 60,
      document,
      parameterValues: {input: 30, middle: 0, output: 0},
      physicsState: createPhysicsState(document),
    })

    expect(result.parameterValues.middle).toBeGreaterThan(0)
    expect(result.parameterValues.output).toBeGreaterThan(0)
    expect(result.physicsState.get('second')?.position).toBeGreaterThan(0)
  })
})
