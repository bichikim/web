import {describe, expect, test} from 'vitest'

import * as player from '../index'

describe('player public API', () => {
  test('should exclude deformation implementation and editor operations', () => {
    expect(player).not.toHaveProperty('applySceneDeformers')
    expect(player).not.toHaveProperty('applySceneNodeAncestorsPoint')
    expect(player).not.toHaveProperty('createDeformerControlPoints')
    expect(player).not.toHaveProperty('createDeformerCurveHandle')
    expect(player).not.toHaveProperty('transformDeformerPoint')
    expect(player).not.toHaveProperty('unapplySceneDeformersPoint')
    expect(player).not.toHaveProperty('unapplySceneNodeAncestorsPoint')
  })
})
