import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {getDocumentScene, getRenderableParts, getScenePartStates} from '../scene'

describe('scene', () => {
  test('should derive a flat visible scene for a document without explicit hierarchy', () => {
    const document = {...createDemoDocument(), scene: undefined}

    expect(getDocumentScene(document).roots.map((node) => node.id)).toEqual([
      'mesh-preview',
      'shape-circle',
      'shape-diamond',
    ])
    expect(getScenePartStates(document)).toEqual([
      {locked: false, partId: 'mesh-preview', visible: true},
      {locked: false, partId: 'shape-circle', visible: true},
      {locked: false, partId: 'shape-diamond', visible: true},
    ])
  })

  test('should propagate group visibility and lock while retaining scene order', () => {
    const document = createDemoDocument()
    const group = document.scene?.roots[1]

    expect(group?.kind).toBe('group')

    const hiddenDocument = {
      ...document,
      scene: {
        roots: [document.scene!.roots[0]!, {...group!, locked: true, visible: false}],
      },
    }

    expect(getScenePartStates(hiddenDocument)).toEqual([
      {locked: false, partId: 'mesh-preview', visible: true},
      {locked: true, partId: 'shape-circle', visible: false},
      {locked: true, partId: 'shape-diamond', visible: false},
    ])
    expect(getRenderableParts(hiddenDocument).map((part) => part.id)).toEqual(['mesh-preview'])
  })
})
