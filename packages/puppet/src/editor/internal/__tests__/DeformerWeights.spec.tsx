/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetSceneDeformerNode} from '../../../player'
import {createBoneDeformer, editBoneRest} from '../bone-editing'
import {getSceneNode} from '../scene-graph'
import {DeformerWeights} from '../DeformerWeights'

afterEach(cleanup)
test('should select a vertex, edit normalized bone weights and return to automatic weighting', () => {
  const [document, setDocument] = createSignal(
    editBoneRest({
      document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
      nodeId: 'bone',
      operation: 'append',
      point: {x: 900, y: 240},
    })!,
  )
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const view = render(() => (
    <DeformerWeights document={document()} node={node()} onDocumentChange={setDocument} />
  ))
  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 1'}))
  fireEvent.input(view.getByRole('spinbutton', {name: '본 1 영향도'}), {target: {value: '25'}})
  fireEvent.change(view.getByRole('spinbutton', {name: '본 1 영향도'}))
  expect(node().boneWeights?.[0]?.weights).toEqual([0.25, 0.75])
  expect(view.getByRole('spinbutton', {name: '본 2 영향도'})).toHaveValue(75)
  fireEvent.click(view.getByRole('button', {name: '자동 영향도로 복원'}))
  expect(node().boneWeights).toEqual([])
})

test('should paint multiple vertices as one undoable stroke and stop after capture loss', () => {
  const initial = editBoneRest({
    document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 900, y: 240},
  })!
  const [document, setDocument] = createSignal(initial)
  const onEditStart = vi.fn()
  const onEditEnd = vi.fn()
  const view = render(() => (
    <DeformerWeights
      document={document()}
      node={getSceneNode(document(), 'bone') as PuppetSceneDeformerNode}
      onDocumentChange={setDocument}
      onEditStart={onEditStart}
      onEditEnd={onEditEnd}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '칠할 본 2'}))
  const svg = view.getByLabelText('디포머 영향도 정점 선택')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 960,
    x: 0,
    bottom: 720,
    y: 0,
    height: 720,
    top: 0,
    toJSON: () => ({}),
    width: 960,
  })
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 160, clientY: 120}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 800, clientY: 120}))
  const painted = document()
  expect(painted).not.toBe(initial)
  expect(onEditStart).toHaveBeenCalledTimes(1)
  fireEvent(svg, new MouseEvent('lostpointercapture', {bubbles: true}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 800, clientY: 600}))
  expect(document()).toBe(painted)
  expect(onEditEnd).toHaveBeenCalledTimes(1)
})

test('should select multiple vertices with Shift and assign one weight to all', () => {
  const [document, setDocument] = createSignal(
    editBoneRest({
      document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
      nodeId: 'bone',
      operation: 'append',
      point: {x: 900, y: 240},
    })!,
  )
  const view = render(() => (
    <DeformerWeights
      document={document()}
      node={getSceneNode(document(), 'bone') as PuppetSceneDeformerNode}
      onDocumentChange={setDocument}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 1'}))
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 2'}), {
    shiftKey: true,
  })
  fireEvent.input(view.getByRole('spinbutton', {name: '일괄 영향도'}), {target: {value: '30'}})
  fireEvent.click(view.getByRole('button', {name: '선택 정점에 적용'}))
  const node = getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  expect(node.boneWeights?.map((entry) => entry.weights[0])).toEqual([0.3, 0.3])
})

test('should subtract influence from a single bone with the brush', () => {
  const initial = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const [document, setDocument] = createSignal(initial)
  const onEditStart = vi.fn()
  const onEditEnd = vi.fn()
  const view = render(() => (
    <DeformerWeights
      document={document()}
      node={getSceneNode(document(), 'bone') as PuppetSceneDeformerNode}
      onDocumentChange={setDocument}
      onEditStart={onEditStart}
      onEditEnd={onEditEnd}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '빼기'}))
  const svg = view.getByLabelText('디포머 영향도 정점 선택')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 960,
    x: 0,
    bottom: 720,
    y: 0,
    height: 720,
    top: 0,
    toJSON: () => ({}),
    width: 960,
  })
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 160, clientY: 120}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 800, clientY: 120}))
  const painted = document()
  expect(painted).not.toBe(initial)
  const node = getSceneNode(painted, 'bone') as PuppetSceneDeformerNode
  expect(node.boneWeights?.[0]?.weights[0]).toBeLessThan(1)
  expect(node.boneWeights?.[0]?.weights[0]).toBeGreaterThanOrEqual(0)
  expect(onEditStart).toHaveBeenCalledTimes(1)
  fireEvent(svg, new MouseEvent('lostpointercapture', {bubbles: true}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 800, clientY: 600}))
  expect(document()).toBe(painted)
  expect(onEditEnd).toHaveBeenCalledTimes(1)
})
