import {createEmptyDocument} from '../../../../player/create-empty-document'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../../player/create-demo-document'
import {parseDocumentValue} from '../../../../player/parse-document'
import {setPhysicsWorld} from '../../physics-chains'
import {updatePhysics} from '../../physics'
import {removeParameterReferences} from '../remove-parameter-references'

test('should keep physics world settings after removing the last pendulum parameter', () => {
  const withPendulum = updatePhysics({document: createDemoDocument(), operation: {kind: 'add'}})!
  const document = setPhysicsWorld(withPendulum, {fps: 30, gravity: [0, 1], wind: [0.5, 0]})
  const [pendulum] = document.physics!.pendulums
  const removed = removeParameterReferences(document, new Set([pendulum!.inputParameterId]))

  expect(removed.physics).toEqual({
    chains: undefined,
    fps: 30,
    gravity: [0, 1],
    pendulums: [],
    wind: [0.5, 0],
  })
  expect(parseDocumentValue(removed).ok).toBe(true)
})

test('should drop physics when no pendulums, chains or world settings remain', () => {
  const document = updatePhysics({document: createDemoDocument(), operation: {kind: 'add'}})!
  const [pendulum] = document.physics!.pendulums
  const removed = removeParameterReferences(document, new Set([pendulum!.inputParameterId]))

  expect(removed.physics).toBeUndefined()
})

test('should remove a colliding parameter row without removing its typed model effect row', () => {
  const document = {
    ...createEmptyDocument(),
    motions: [
      {
        duration: 1,
        id: 'motion',
        timelineEffectRows: [{kind: 'model' as const, target: 'opacity' as const}],
        timelineParameterIds: ['model:opacity'],
        tracks: [],
      },
    ],
    parameters: [
      {defaultValue: 0, id: 'model:opacity', maximum: 10, minimum: 0, name: 'Parameter'},
    ],
  }
  const removed = removeParameterReferences(document, new Set(['model:opacity']))
  expect(removed.motions[0]?.timelineParameterIds).toEqual([])
  expect(removed.motions[0]?.timelineEffectRows).toEqual([{kind: 'model', target: 'opacity'}])
})
