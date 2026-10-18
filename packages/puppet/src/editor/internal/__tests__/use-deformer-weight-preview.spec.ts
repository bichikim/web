import {createRoot, createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {getSceneNode} from '../scene-graph'
import {useDeformerWeightPreview} from '../use-deformer-weight-preview'

test('should skip document traversal while disabled and derive the latest vertices when enabled', () => {
  const initial = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'deformer',
  })!
  const node = getSceneNode(initial, 'shapes')!
  if (node.kind !== 'deformer') {
    throw new Error('Expected a deformer')
  }
  const read = vi.fn()
  createRoot((dispose) => {
    const [enabled, setEnabled] = createSignal(false)
    const [document, setDocument] = createSignal(initial)
    const preview = useDeformerWeightPreview({
      boneIndex: 0,
      get document() {
        read()
        return document()
      },
      enabled,
      node,
    })
    expect(preview.vertices()).toEqual([])
    expect(preview.triangles()).toEqual([])
    expect(read).not.toHaveBeenCalled()
    setDocument({...initial, parts: initial.parts.filter((part) => part.id !== 'shape-circle')})
    expect(read).not.toHaveBeenCalled()
    setEnabled(true)
    expect(preview.vertices().map((vertex) => vertex.partId)).not.toContain('shape-circle')
    expect(preview.vertices().length).toBeGreaterThan(0)
    expect(preview.triangles().length).toBeGreaterThan(0)
    setEnabled(false)
    read.mockClear()
    setDocument(initial)
    expect(preview.vertices()).toEqual([])
    expect(preview.vertexWeights().size).toBe(0)
    expect(read).not.toHaveBeenCalled()
    dispose()
  })
})
