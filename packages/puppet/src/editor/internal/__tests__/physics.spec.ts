import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue} from '../../../player'
import {updatePhysics} from '../physics'

const addPendulum = (document: ReturnType<typeof createDemoDocument>) =>
  updatePhysics({document, operation: {kind: 'add'}})

describe('updatePhysics', () => {
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
