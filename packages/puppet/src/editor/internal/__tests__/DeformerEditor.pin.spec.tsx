/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, parseDocument, type PuppetSceneDeformerNode} from '../../../player'
import {transformDeformerPoint} from '../../../deformation'
import {convertSceneContainers} from '../container-conversion'
import {getSceneNode} from '../scene-graph'
import {DeformerEditor} from '../DeformerEditor'
import {addParameter, setParameterKeyformDeformerControlPoints} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'

const createDocument = () =>
  convertSceneContainers({document: createDemoDocument(), nodeIds: ['shapes'], targetKind: 'pin'})!

test('should pose a pin, preserve the result while placing it, and add and delete pins', () => {
  const [document, setDocument] = createSignal(createDocument())
  const node = () => getSceneNode(document(), 'shapes') as PuppetSceneDeformerNode
  const view = render(() => (
    <DeformerEditor document={document()} activeNodeId="shapes" onDocumentChange={setDocument} />
  ))
  const point = {x: node().controlPoints[0]!, y: node().controlPoints[1]!}
  const svg = view.getByLabelText('핀 디포머 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    top: 0,
    toJSON: () => ({}),
    x: 0,
    width: 960,
    y: 0,
  })
  fireEvent.keyDown(view.getByRole('button', {name: '핀 1'}), {key: 'ArrowRight', shiftKey: true})
  const posed = transformDeformerPoint(node(), point)
  expect(posed.x).toBeCloseTo(point.x + 10)
  fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
  fireEvent.keyDown(view.getByRole('button', {name: '핀 1'}), {key: 'ArrowDown', shiftKey: true})
  expect(transformDeformerPoint(node(), point)).toEqual(posed)
  fireEvent.input(view.getByLabelText('핀 영향 반경'), {target: {value: '120'}})
  expect(node().pins![0]!.radius).toBe(120)
  expect(transformDeformerPoint(node(), point)).toEqual(posed)
  const beforeAppend = document()
  fireEvent.dblClick(svg, {clientX: 750, clientY: 300})
  expect(node().pins).toHaveLength(2)
  expect(transformDeformerPoint(node(), point)).toEqual(posed)
  setDocument(beforeAppend)
  expect(view.getByRole('button', {name: '핀 1'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.dblClick(svg, {clientX: 750, clientY: 300})
  fireEvent.keyDown(svg, {key: 'Backspace'})
  expect(node().pins).toHaveLength(1)
  fireEvent(
    view.getByRole('button', {name: '핀 1'}),
    new MouseEvent('pointerdown', {bubbles: true, button: 0}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 400, clientY: 250}))
  const firstDrag = node().controlPoints
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 450, clientY: 260}))
  fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
  expect(node().controlPoints).not.toEqual(firstDrag)
  expect(transformDeformerPoint(node(), point)).toEqual(posed)
  expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
})

test('should save pin motion into a keyform and lock the binding layout', () => {
  const result = addParameter({document: createDocument(), nodeIds: ['shapes']})!
  const [document, setDocument] = createSignal(result.document)
  const binding = () => document().parameterBindings!.at(-1)!
  const view = render(() => (
    <DeformerEditor
      document={document()}
      previewDocument={createParameterPreview({document: document()})}
      activeNodeId="shapes"
      editMode="parameter"
      activeBindingId={binding().id}
      activeKeyformValues={[0]}
      targetNodeIds={['shapes']}
      onDocumentChange={setDocument}
    />
  ))
  expect(view.getByRole('button', {name: '기준 배치'})).toBeDisabled()
  expect(view.getByLabelText('핀 강도')).toBeDisabled()
  const before = binding().keyforms.find((keyform) => keyform.values[0] === 0)!.deformers![0]!
    .controlPoints
  fireEvent.keyDown(view.getByRole('button', {name: '핀 1'}), {key: 'ArrowRight'})
  expect(
    binding().keyforms.find((keyform) => keyform.values[0] === 0)!.deformers![0]!.controlPoints[0],
  ).toBe(before[0]! + 1)
  expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
})

test('should stop captured dragging when pointer capture is lost', () => {
  const [document, setDocument] = createSignal(createDocument())
  const onEditEnd = vi.fn()
  const view = render(() => (
    <DeformerEditor
      document={document()}
      activeNodeId="shapes"
      onDocumentChange={setDocument}
      onEditEnd={onEditEnd}
    />
  ))
  const svg = view.getByLabelText('핀 디포머 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    bottom: 720,
    right: 960,
    height: 720,
    x: 0,
    toJSON: () => ({}),
    y: 0,
    top: 0,
    width: 960,
  })
  fireEvent(
    view.getByRole('button', {name: '핀 1'}),
    new MouseEvent('pointerdown', {bubbles: true}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 400, clientY: 250}))
  const before = document()
  fireEvent(svg, new MouseEvent('lostpointercapture', {bubbles: true}))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 450, clientY: 260}))
  expect(document()).toBe(before)
  expect(onEditEnd).toHaveBeenCalledTimes(1)
})

test('should edit a composed pin without duplicating another parameter pose', () => {
  const initial = createDocument()
  const rest = getSceneNode(initial, 'shapes') as PuppetSceneDeformerNode
  const first = addParameter({document: initial, nodeIds: ['shapes']})!
  const firstPose = setParameterKeyformDeformerControlPoints({
    bindingId: first.binding.id,
    controlPoints: rest.controlPoints.map((value, index) => value + (index % 2 === 0 ? 10 : 0)),
    document: first.document,
    nodeId: 'shapes',
    values: [0],
  })!
  const second = addParameter({document: firstPose, nodeIds: ['shapes']})!
  const source = setParameterKeyformDeformerControlPoints({
    bindingId: second.binding.id,
    controlPoints: rest.controlPoints.map((value, index) => value + (index % 2 === 0 ? 20 : 0)),
    document: second.document,
    nodeId: 'shapes',
    values: [0],
  })!
  const [document, setDocument] = createSignal(source)
  const preview = () =>
    createParameterPreview({document: document(), editingBindingId: first.binding.id})
  const view = render(() => (
    <DeformerEditor
      document={document()}
      previewDocument={preview()}
      activeNodeId="shapes"
      editMode="parameter"
      activeBindingId={first.binding.id}
      activeKeyformValues={[0]}
      targetNodeIds={['shapes']}
      onDocumentChange={setDocument}
    />
  ))
  const point = view.getByRole('button', {name: '핀 1'})
  expect(Number(point.getAttribute('cx'))).toBeCloseTo(rest.controlPoints[0]! + 30)
  fireEvent.keyDown(point, {key: 'ArrowRight'})
  expect(Number(point.getAttribute('cx'))).toBeCloseTo(rest.controlPoints[0]! + 31)
  fireEvent.keyDown(point, {key: 'ArrowRight'})
  expect(Number(point.getAttribute('cx'))).toBeCloseTo(rest.controlPoints[0]! + 32)
  expect(
    document().parameterBindings?.find((binding) => binding.id === first.binding.id)?.keyforms[0]
      ?.deformers?.[0]?.controlPoints[0],
  ).toBeCloseTo(rest.controlPoints[0]! + 12)
  expect(document().parameterBindings?.find((binding) => binding.id === second.binding.id)).toEqual(
    source.parameterBindings.find((binding) => binding.id === second.binding.id),
  )
  expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
})
