import {expect, test} from 'vitest'
import {createDemoDocument, getDocumentScene, parseDocument} from '../../../player'
import {setMaskTarget} from '../mask-targets'

test('should add and remove a target without changing other masks or the source', () => {
  const document = createDemoDocument()
  const next = setMaskTarget({
    document,
    checked: true,
    maskPartId: 'shape-circle',
    targetPartId: 'shape-diamond',
  })!
  expect(
    next.parts.find((part) => part.id === 'shape-diamond')?.properties?.clippingMaskIds,
  ).toEqual(['mesh-preview', 'shape-circle'])
  expect(next.parts.find((part) => part.id === 'shape-circle')).toBe(
    document.parts.find((part) => part.id === 'shape-circle'),
  )
  const removed = setMaskTarget({
    document: next,
    checked: false,
    maskPartId: 'shape-circle',
    targetPartId: 'shape-diamond',
  })!
  expect(
    removed.parts.find((part) => part.id === 'shape-diamond')?.properties?.clippingMaskIds,
  ).toEqual(['mesh-preview'])
  expect(parseDocument(JSON.stringify(next)).ok).toBe(true)
})

test('should reject self references, cycles, and missing targets', () => {
  const document = createDemoDocument()
  for (const targetPartId of ['shape-circle', 'mesh-preview', 'missing']) {
    expect(
      setMaskTarget({document, checked: true, maskPartId: 'shape-circle', targetPartId}),
    ).toBeUndefined()
  }
})

test('should respect source locks and inherited target locks', () => {
  const source = createDemoDocument()
  for (const id of ['mesh-preview', 'shape-group']) {
    const document = {
      ...source,
      scene: {
        roots: getDocumentScene(source).roots.map((node) =>
          node.id === 'mesh-preview'
            ? {...node, locked: id === 'mesh-preview'}
            : {...node, locked: id === 'shape-group'},
        ),
      },
    }
    expect(
      setMaskTarget({
        document,
        maskPartId: 'mesh-preview',
        checked: false,
        targetPartId: 'shape-diamond',
      }),
    ).toBeUndefined()
  }
})
