/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, parseDocument, type PuppetSceneDeformerNode} from '../../../player'
import {BoneEditor} from '../BoneEditor'
import {createBoneDeformer, editBoneRest} from '../bone-editing'
import {getSceneNode} from '../scene-graph'
import {addParameter} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'

test('should place bind joints, pose a chain with fixed lengths, and preserve the document contract', () => {
  const source = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const [document, setDocument] = createSignal(source)
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const view = render(() => (
    <BoneEditor
      node={node()}
      document={document()}
      activeNodeId="bone"
      onDocumentChange={setDocument}
    />
  ))
  const svg = view.getByLabelText('본 디포머 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
  fireEvent.dblClick(svg, {clientX: 850, clientY: 420})
  expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(3)
  expect(view.getByRole('button', {name: '기준 배치'})).toHaveAttribute('aria-pressed', 'true')
  const rest = node().boneRestPoints!
  fireEvent.click(view.getByRole('button', {name: /^변형 편집$/}))
  fireEvent.focus(view.getByRole('button', {name: '본 관절 2'}))
  fireEvent.keyDown(svg, {key: 'ArrowDown', shiftKey: true})
  expect(node().controlPoints[3]).toBeGreaterThan(rest[3]!)
  expect(
    Math.hypot(
      node().controlPoints[2]! - node().controlPoints[0]!,
      node().controlPoints[3]! - node().controlPoints[1]!,
    ),
  ).toBeCloseTo(640)
  const end = view.getByRole('button', {name: '본 관절 2'})
  fireEvent(end, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 750, clientY: 430}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 650, clientY: 550}))
  fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
  const angle = Math.atan2(190, 490)
  expect(node().controlPoints[2]).toBeCloseTo(640 * Math.cos(angle))
  expect(node().controlPoints[3]).toBeCloseTo(240 + 640 * Math.sin(angle))
  expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
})

test('should save a bone pose into the selected keyform while preserving bind joints', () => {
  const source = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const added = addParameter({document: source, nodeIds: ['bone']})!
  const binding = added.document.parameterBindings!.at(-1)!
  const [document, setDocument] = createSignal(added.document)
  const preview = () => createParameterPreview({document: document()})
  const view = render(() => (
    <BoneEditor
      document={document()}
      previewDocument={preview()}
      node={getSceneNode(preview(), 'bone') as PuppetSceneDeformerNode}
      activeNodeId="bone"
      activeBindingId={binding.id}
      activeKeyformValues={[0]}
      editMode="parameter"
      targetNodeIds={['bone']}
      onDocumentChange={setDocument}
    />
  ))
  expect(view.getByRole('button', {name: '기준 배치'})).toBeDisabled()
  fireEvent.click(view.getByRole('button', {name: '끝 관절 IK'}))
  fireEvent.focus(view.getByRole('button', {name: '본 관절 2'}))
  fireEvent.keyDown(view.getByLabelText('본 디포머 편집 영역'), {key: 'ArrowDown', shiftKey: true})
  expect(
    document()
      .parameterBindings!.at(-1)!
      .keyforms.find((keyform) => keyform.values[0] === 0)!.deformers![0]!.controlPoints,
  ).not.toEqual(
    binding.keyforms.find((keyform) => keyform.values[0] === 0)!.deformers![0]!.controlPoints,
  )
  expect((getSceneNode(document(), 'bone') as PuppetSceneDeformerNode).boneRestPoints).toEqual(
    (getSceneNode(source, 'bone') as PuppetSceneDeformerNode).boneRestPoints,
  )
  expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
})

test('should drag the IK endpoint while keeping the root and bone lengths fixed', () => {
  const source = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const chain = editBoneRest({
    document: source,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 960, y: 240},
  })!
  const [document, setDocument] = createSignal(chain)
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const view = render(() => (
    <BoneEditor
      node={node()}
      document={document()}
      activeNodeId="bone"
      onDocumentChange={setDocument}
    />
  ))
  const svg = view.getByLabelText('본 디포머 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '끝 관절 IK'}))
  fireEvent(
    view.getByRole('button', {name: '본 관절 3'}),
    new MouseEvent('pointerdown', {bubbles: true, button: 0}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 800, clientY: 520}))
  fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
  const points = node().controlPoints
  expect(points.slice(0, 2)).toEqual([0, 240])
  expect(Math.hypot(points[2]!, points[3]! - 240)).toBeCloseTo(640)
  expect(Math.hypot(points[4]! - points[2]!, points[5]! - points[3]!)).toBeCloseTo(320)
  expect(points[4]).toBeCloseTo(640, 1)
  expect(points[5]).toBeCloseTo(400, 1)
  expect(view.getByRole('button', {name: '끝 관절 IK'})).toHaveAttribute('aria-pressed', 'true')
})

test('should stop captured dragging when pointer capture is lost', () => {
  const [document, setDocument] = createSignal(
    createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
  )
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const onEditEnd = vi.fn()
  const view = render(() => (
    <BoneEditor
      node={node()}
      document={document()}
      activeNodeId="bone"
      onDocumentChange={setDocument}
      onEditEnd={onEditEnd}
    />
  ))
  const svg = view.getByLabelText('본 디포머 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    left: 0,
    y: 0,
    right: 960,
    top: 0,
    bottom: 720,
    height: 720,
    width: 960,
    toJSON: () => ({}),
  })
  fireEvent(
    view.getByRole('button', {name: '본 관절 1'}),
    new MouseEvent('pointerdown', {bubbles: true}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 400, clientY: 250}))
  const before = document()
  fireEvent(svg, new MouseEvent('lostpointercapture', {bubbles: true}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 450, clientY: 260}))
  expect(document()).toBe(before)
  expect(onEditEnd).toHaveBeenCalledTimes(1)
})
