/** @vitest-environment jsdom */
import {fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {Portal} from 'solid-js/web'
import {expect, test, vi} from 'vitest'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../../../player'
import {DeformerEditor} from '../DeformerEditor'
import {addParameter, insertParameterKeyform} from '../parameter-keyforms'
import {
  createDeformer,
  createDocument,
  getEditorSvg,
  mockViewportBounds,
} from './fixtures/deformer-editor'

const createGrid = (): PuppetSceneDeformerNode => ({
  ...createDeformer(),
  columns: 2,
  controlPoints: [0, 0, 50, 0, 100, 0, 0, 50, 70, 60, 100, 50, 0, 100, 50, 100, 100, 100],
  rows: 2,
})
const pointer = (type: string) =>
  new MouseEvent(type, {bubbles: true, button: 0, clientX: 264, clientY: 212})
const getPoints = (document: PuppetDocument) =>
  (document.scene!.roots[0] as PuppetSceneDeformerNode).controlPoints

test('should keep the grid selector in the shared toolbar and settings above the canvas', () => {
  const controls = document.createElement('div')
  const settings = document.createElement('div')
  const inspector = document.createElement('div')
  const [mount, setMount] = createSignal<HTMLDivElement | undefined>(controls)
  const view = render(() => (
    <>
      {controls}
      {settings}
      {inspector}
      <DeformerEditor
        activeNodeId="deformer"
        brushControlsExternal
        brushControlsMount={mount()}
        brushSettingsMount={settings}
        document={createDocument(createGrid())}
        renderControls={(content) => <Portal mount={inspector}>{content}</Portal>}
      />
    </>
  ))
  const brush = within(controls).getByRole('button', {name: '디포머 변형 브러시'})
  expect(view.getAllByRole('button', {name: '디포머 변형 브러시'})).toHaveLength(1)
  expect(within(inspector).queryByRole('button', {name: '디포머 변형 브러시'})).toBeNull()
  fireEvent.click(brush)
  expect(within(settings).getByRole('spinbutton', {name: '디포머 브러시 반경'})).toBeVisible()
  expect(within(controls).queryByRole('spinbutton')).toBeNull()
  setMount(undefined)
  expect(view.queryByRole('button', {name: '디포머 변형 브러시'})).toBeNull()
  expect(within(settings).queryByRole('spinbutton')).toBeNull()
})

test('should preview smoothing and commit one document at pointer release', () => {
  const initial = createDocument(createGrid())
  const [document, setDocument] = createSignal(initial)
  const save = vi.fn(setDocument)
  const end = vi.fn()
  const view = render(() => (
    <DeformerEditor
      document={document()}
      activeNodeId="deformer"
      onDocumentChange={save}
      onEditEnd={end}
    />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '격자 정리 브러시'}))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(svg, pointer('pointermove'))
  expect(save).not.toHaveBeenCalled()
  expect(document()).toBe(initial)
  fireEvent(svg, pointer('pointerup'))
  expect(save).toHaveBeenCalledTimes(1)
  expect(end).toHaveBeenCalledTimes(1)
  expect(getPoints(document())[8]).toBeLessThan(70)
  expect(getPoints(document())[9]).toBeLessThan(60)
  expect(getPoints(document()).slice(0, 8)).toEqual(getPoints(initial).slice(0, 8))
})

test('should discard an unfinished stroke on Escape and pointer capture loss', () => {
  const initial = createDocument(createGrid())
  const save = vi.fn()
  const view = render(() => (
    <DeformerEditor document={initial} activeNodeId="deformer" onDocumentChange={save} />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '격자 정리 브러시'}))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent.keyDown(svg, {key: 'Escape'})
  fireEvent(svg, pointer('pointerup'))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(svg, pointer('lostpointercapture'))
  fireEvent(svg, pointer('pointerup'))
  expect(save).not.toHaveBeenCalled()
  expect(getPoints(initial)[8]).toBe(70)
})

test('should move a one-cell warp grid only once when releasing the brush', () => {
  const initial = createDocument(createDeformer())
  const save = vi.fn()
  const view = render(() => (
    <DeformerEditor document={initial} activeNodeId="deformer" onDocumentChange={save} />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '디포머 변형 브러시'}))
  expect(view.getByRole('button', {name: '격자 정리 브러시'})).toBeDisabled()
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 280, clientY: 220}))
  expect(save).not.toHaveBeenCalled()
  fireEvent(svg, pointer('pointerup'))
  expect(save).toHaveBeenCalledTimes(1)
  expect(getPoints(save.mock.calls[0]![0])).not.toEqual(getPoints(initial))
})

test('should force contraction with Shift on a rightward expansion drag', () => {
  const initial = createDocument(createGrid())
  const save = vi.fn()
  const view = render(() => (
    <DeformerEditor document={initial} activeNodeId="deformer" onDocumentChange={save} />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '디포머 팽창·수축 브러시'}))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(
    svg,
    new MouseEvent('pointermove', {bubbles: true, clientX: 280, clientY: 212, shiftKey: true}),
  )
  fireEvent(svg, pointer('pointerup'))
  expect(getPoints(save.mock.calls[0]![0])[8]).toBeGreaterThan(70)
  expect(getPoints(save.mock.calls[0]![0])[9]).toBeGreaterThan(60)
})

test('should discard a stroke when switching brush modes', () => {
  const initial = createDocument(createGrid())
  const save = vi.fn()
  const view = render(() => (
    <DeformerEditor document={initial} activeNodeId="deformer" onDocumentChange={save} />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '디포머 팽창·수축 브러시'}))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 280, clientY: 212}))
  fireEvent.click(view.getByRole('button', {name: '디포머 변형 브러시'}))
  fireEvent(svg, pointer('pointerup'))
  expect(save).not.toHaveBeenCalled()
})

test('should store grid and curvature handle movement in the selected keyform only', () => {
  const initial = createDocument({
    ...createGrid(),
    curveHandles: [{horizontal: {x: 80, y: 60}, pointIndex: 4, vertical: {x: 70, y: 70}}],
  })
  const added = addParameter({document: initial, nodeIds: ['deformer']})!
  const source = insertParameterKeyform({
    bindingId: added.binding.id,
    document: added.document,
    values: [30],
  })!
  const save = vi.fn()
  const view = render(() => (
    <DeformerEditor
      document={source}
      activeNodeId="deformer"
      activeBindingId={added.binding.id}
      activeKeyformValues={[30]}
      editMode="parameter"
      targetNodeIds={['deformer']}
      onDocumentChange={save}
    />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent.click(view.getByRole('button', {name: '디포머 변형 브러시'}))
  fireEvent(svg, pointer('pointerdown'))
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 280, clientY: 220}))
  fireEvent(svg, pointer('pointerup'))
  const changed: PuppetDocument = save.mock.calls[0]![0]
  expect(getPoints(changed)).toEqual(getPoints(source))
  const forms = changed.parameterBindings!.find(
    (binding) => binding.id === added.binding.id,
  )!.keyforms
  expect(forms[0]).toEqual(added.binding.keyforms[0])
  expect(forms[1]!.deformers![0]!.controlPoints[8]).toBeGreaterThan(70)
  expect(forms[1]!.deformers![0]!.curveHandles![0]!.horizontal.x).toBeGreaterThan(80)
})
