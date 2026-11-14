import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue} from '../../../player'
import {type PhysicsOperation, updatePhysics} from '../physics'
import {addPhysicsChain} from '../physics-chains'

const addPendulum = (document: ReturnType<typeof createDemoDocument>) =>
  updatePhysics({document, operation: {kind: 'add'}})

describe('updatePhysics', () => {
  test.each<PhysicsOperation>([
    {kind: 'add'},
    {changes: {damping: 0.5}, kind: 'update', pendulumId: 'pendulum-1'},
    {kind: 'remove', pendulumId: 'pendulum-1'},
  ])('should preserve chains and world settings during $kind', (operation) => {
    const added = addPendulum(createDemoDocument())!
    const chained = addPhysicsChain(
      {
        ...added,
        parameters: [
          ...added.parameters!,
          {defaultValue: 0, id: 'extra', maximum: 1, minimum: -1, name: 'Extra'},
        ],
      },
      'angle-x',
    )!.document
    const physics = {
      ...chained.physics!,
      fps: 30,
      gravity: [0, -1] as const,
      wind: [0.1, 0] as const,
    }
    const updated = updatePhysics({document: {...chained, physics}, operation})
    expect(updated?.physics).toMatchObject({
      chains: physics.chains,
      fps: 30,
      gravity: physics.gravity,
      wind: physics.wind,
    })
    expect(parseDocumentValue(updated).ok).toBe(true)
  })

  test('should retain world settings when removing the last pendulum without chains', () => {
    const added = addPendulum(createDemoDocument())!
    const updated = updatePhysics({
      document: {...added, physics: {...added.physics!, fps: 60}},
      operation: {kind: 'remove', pendulumId: 'pendulum-1'},
    })
    expect(updated?.physics).toEqual({fps: 60, pendulums: []})
  })

  test('should add a pendulum with available parameters', () => {
    const document = createDemoDocument()
    const updated = addPendulum(document)

    expect(updated?.physics?.pendulums).toEqual([
      {
        damping: 1.2,
        gravity: 9.8,
        id: 'pendulum-1',
        inputParameterId: 'angle-x',
        inputScale: 1,
        length: 1,
        outputParameterId: 'angle-y',
        outputScale: 1,
      },
    ])
    expect(parseDocumentValue(updated).ok).toBe(true)
  })

  test('should add a pendulum to the requested input parameter', () => {
    const document = createDemoDocument()
    const updated = updatePhysics({
      document,
      operation: {inputParameterId: 'angle-y', kind: 'add'},
    })

    expect(updated?.physics?.pendulums[0]).toMatchObject({
      inputParameterId: 'angle-y',
      outputParameterId: 'angle-x',
    })
    expect(parseDocumentValue(updated).ok).toBe(true)
  })

  test('should update a pendulum while preserving a valid parameter mapping', () => {
    const added = addPendulum(createDemoDocument())!
    const updated = updatePhysics({
      document: added,
      operation: {
        changes: {
          damping: 0.4,
          inputParameterId: 'angle-y',
          outputParameterId: 'angle-x',
        },
        kind: 'update',
        pendulumId: 'pendulum-1',
      },
    })

    expect(updated?.physics?.pendulums[0]).toMatchObject({
      damping: 0.4,
      inputParameterId: 'angle-y',
      outputParameterId: 'angle-x',
    })
    expect(parseDocumentValue(updated).ok).toBe(true)
  })

  test('should reject an update that creates an invalid mapping', () => {
    const added = addPendulum(createDemoDocument())!

    expect(
      updatePhysics({
        document: added,
        operation: {
          changes: {outputParameterId: 'angle-x'},
          kind: 'update',
          pendulumId: 'pendulum-1',
        },
      }),
    ).toBeUndefined()
  })

  test('should remove a pendulum and omit empty physics settings', () => {
    const added = addPendulum(createDemoDocument())!
    const updated = updatePhysics({
      document: added,
      operation: {kind: 'remove', pendulumId: 'pendulum-1'},
    })

    expect(updated).toMatchObject({physics: undefined})
    expect(parseDocumentValue(updated).ok).toBe(true)
  })
})
