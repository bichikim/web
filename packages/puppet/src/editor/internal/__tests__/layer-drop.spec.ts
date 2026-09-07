import {describe, expect, test} from 'vitest'

import {createDemoDocument, getDocumentScene} from '../../../player'
import {getLayerDropPosition} from '../layer-drop'
import {createDeformer, getSceneNode} from '../scene-graph'

const bounds = {height: 100, top: 20} as DOMRect

describe('layer drop', () => {
  test('should target the center of every container kind', () => {
    const document = createDemoDocument()
    const group = getSceneNode(document, 'shapes')!
    const deformerDocument = createDeformer(document, ['shape-circle'])!
    const deformer = getSceneNode(deformerDocument, 'deformer')!

    expect(getLayerDropPosition(group, bounds, 70)).toBe('inside')
    expect(getLayerDropPosition(deformer, bounds, 70)).toBe('inside')
  })

  test('should keep parts as sibling drop targets', () => {
    const part = getDocumentScene(createDemoDocument()).roots[1]!

    expect(getLayerDropPosition(part, bounds, 30)).toBe('before')
    expect(getLayerDropPosition(part, bounds, 110)).toBe('after')
  })

  test('should prefer nesting containers with empty bounds', () => {
    const group = getSceneNode(createDemoDocument(), 'shapes')!

    expect(getLayerDropPosition(group, {...bounds, height: 0}, 20)).toBe('inside')
  })
})
