import {expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {getMirrorAxisReferences} from '../mirror-axis-references'

test('should offer the canvas center, then each rotation deformer’s pivot', () => {
  const demo = createDemoDocument()
  const document: PuppetDocument = {
    ...demo,
    scene: {
      roots: [
        {
          boneRestPoints: [40, 50, 80, 50],
          bounds: {height: 10, width: 10, x: 0, y: 0},
          children: [],
          columns: 1,
          controlPoints: [40, 50, 80, 50],
          deformerType: 'rotation',
          id: 'shoulder',
          kind: 'deformer',
          locked: false,
          name: '어깨',
          rotationOrigin: {x: 40, y: 50},
          rows: 1,
          visible: true,
        },
      ],
    },
  }
  expect(getMirrorAxisReferences(document)).toEqual([
    {label: '캔버스 중심', point: {x: demo.viewport.width / 2, y: demo.viewport.height / 2}},
    {label: '어깨 중심', point: {x: 40, y: 50}},
  ])
})
