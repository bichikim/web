/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../../player'
import {DeformerWeights} from '../DeformerWeights'
import {setDeformerVertexWeight} from '../deformer-weights'
import {getSceneNode} from '../scene-graph'
import {EDITABLE_BONE_DOCUMENT} from './fixtures/deformer-weights'

vi.mock('../WeightPaintControls', () => ({
  WeightPaintControls: (props: {editor: {setTool: (tool: 'paint' | 'select') => void}}) => (
    <button onClick={() => props.editor.setTool('select')}>정점 선택</button>
  ),
}))
vi.mock('../use-deformer-weight-preview', () => ({
  useDeformerWeightPreview: (props: {node: PuppetSceneDeformerNode}) => {
    const vertex = {partId: 'mesh-preview', vertexIndex: 0, x: 0, y: 0}
    const key = JSON.stringify([vertex.partId, vertex.vertexIndex])
    const weights = () =>
      props.node.boneWeights?.find(
        (entry) => entry.partId === vertex.partId && entry.vertexIndex === vertex.vertexIndex,
      )?.weights ?? [0.5, 0.5]

    return {
      influence: () => weights()[0] ?? 0,
      isManual: () =>
        props.node.boneWeights?.some(
          (entry) => entry.partId === vertex.partId && entry.vertexIndex === vertex.vertexIndex,
        ) === true,
      segments: () => [
        {index: 0, x: 0, y: 0},
        {index: 1, x: 0, y: 0},
      ],
      triangles: () => [],
      vertexWeights: () => new Map([[key, weights()]]),
      vertices: () => [vertex],
      viewBox: () => '0 0 100 100',
    }
  },
}))

afterEach(cleanup)

const renderWeights = (initialDocument = EDITABLE_BONE_DOCUMENT) => {
  const [document, setDocument] = createSignal(initialDocument)
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const view = render(() => (
    <DeformerWeights document={document()} node={node()} onDocumentChange={setDocument} />
  ))
  return {node, view}
}

const selectFirstVertex = (view: ReturnType<typeof render>) => {
  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 1'}))
}

test('should edit and normalize a selected vertex weight', () => {
  const {node, view} = renderWeights()
  selectFirstVertex(view)
  const firstWeight = view.getByRole('spinbutton', {name: '본 1 영향도'})
  fireEvent.input(firstWeight, {target: {value: '25'}})
  fireEvent.change(firstWeight)

  expect(node().boneWeights?.[0]?.weights).toEqual([0.25, 0.75])
  expect(view.getByRole('spinbutton', {name: '본 2 영향도'})).toHaveValue(75)
})

test('should restore a selected vertex to automatic weighting', () => {
  const document = setDeformerVertexWeight({
    boneIndex: 0,
    document: EDITABLE_BONE_DOCUMENT,
    nodeId: 'bone',
    partId: 'mesh-preview',
    vertexIndex: 0,
    weight: 0.25,
  })!
  const {node, view} = renderWeights(document)
  selectFirstVertex(view)
  fireEvent.click(view.getByRole('button', {name: '자동 영향도로 복원'}))
  expect(node().boneWeights).toEqual([])
})
