/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {DeformerEditor} from '../DeformerEditor'
import {convertSceneContainers} from '../container-conversion'
import {addParameter, insertParameterKeyform} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {createSceneGroup, getSceneNode} from '../scene-graph'
import {
  createDeformer,
  createDocument,
  getEditorSvg,
  mockViewportBounds,
} from './fixtures/deformer-editor'

const pointer = (type: string, options: MouseEventInit = {}) => {
  const event = new MouseEvent(type, {...options, bubbles: true})
  Object.defineProperty(event, 'pointerId', {value: 7})
  return event
}

afterEach(cleanup)

test.each(['surface', 'spatial'] as const)(
  'should discard a %s drag when its document is undone',
  (kind) => {
    const initial =
      kind === 'spatial'
        ? convertSceneContainers({
            document: createDemoDocument(),
            nodeIds: ['shapes'],
            targetKind: 'spatial',
          })!
        : createDocument(createDeformer())
    const history = useDocumentHistory({initialDocument: initial})
    const end = vi.fn(history.endTransaction)
    const view = render(() => (
      <DeformerEditor
        document={history.document()}
        activeNodeId={kind === 'spatial' ? 'shapes' : 'deformer'}
        onDocumentChange={history.setDocument}
        onEditStart={history.beginTransaction}
        onEditEnd={end}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)
    const handle = view.getByRole('button', {
      name: kind === 'spatial' ? '3D Y축 회전' : '자유 변형 회전 핸들',
    })
    fireEvent(handle, pointer('pointerdown', {clientX: 330, clientY: 170}))
    fireEvent(svg, pointer('pointermove', {clientX: 300, clientY: 200}))
    expect(history.document()).not.toBe(initial)
    const firstMove = history.document()
    fireEvent(svg, pointer('pointermove', {clientX: 280, clientY: 210}))
    expect(history.document()).not.toBe(firstMove)
    expect(end).not.toHaveBeenCalled()
    expect(history.undo()).toBe(true)
    fireEvent(svg, pointer('pointermove', {clientX: 210, clientY: 220}))
    fireEvent(svg, pointer('pointerup'))
    expect(history.document()).toBe(initial)
    expect(history.canRedo()).toBe(true)
    expect(end).toHaveBeenCalledOnce()
  },
)

test('should end a spatial drag when the selected spatial deformer changes', () => {
  const initial = convertSceneContainers({
    document: createSceneGroup(createDemoDocument(), [])!,
    nodeIds: ['shapes', 'group'],
    targetKind: 'spatial',
  })!
  const [document, setDocument] = createSignal(initial)
  const [active, setActive] = createSignal('shapes')
  const end = vi.fn()
  const view = render(() => (
    <DeformerEditor
      document={document()}
      activeNodeId={active()}
      onDocumentChange={setDocument}
      onEditEnd={end}
    />
  ))
  const svg = getEditorSvg(view.container)
  fireEvent(
    view.getByRole('button', {name: '3D Y축 회전'}),
    pointer('pointerdown', {bubbles: true, clientX: 0}),
  )
  setActive('group')
  fireEvent(svg, pointer('pointermove', {bubbles: true, clientX: 64}))
  expect(document()).toBe(initial)
  expect(getSceneNode(document(), 'group')).toMatchObject({spatialRotation: [0, 0, 0]})
  expect(end).toHaveBeenCalledTimes(1)
})

test('should close the spatial history transaction when the editor unmounts', () => {
  const initial = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const history = useDocumentHistory({initialDocument: initial})
  const view = render(() => (
    <DeformerEditor
      document={history.document()}
      activeNodeId="shapes"
      onDocumentChange={history.setDocument}
      onEditStart={history.beginTransaction}
      onEditEnd={history.endTransaction}
    />
  ))
  const svg = getEditorSvg(view.container)
  fireEvent(
    view.getByRole('button', {name: '3D Y축 회전'}),
    pointer('pointerdown', {bubbles: true, clientX: 0}),
  )
  fireEvent(svg, pointer('pointermove', {bubbles: true, clientX: 64}))
  view.unmount()
  expect(history.undoCount()).toBe(1)
  history.setDocument({
    ...history.document(),
    viewport: {...history.document().viewport, width: 777},
  })
  expect(history.undoCount()).toBe(2)
  history.undo()
  expect(history.document().viewport).toEqual(initial.viewport)
})

test.each(['handle', 'brush'] as const)(
  'should discard a %s gesture when its keyform changes',
  (tool) => {
    const added = addParameter({
      document: {
        ...createDocument(createDeformer()),
        motions: [],
        parameterBindings: [],
        parameters: [],
      },
      nodeIds: ['deformer'],
    })!
    const initial = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const [document, setDocument] = createSignal<PuppetDocument>(initial)
    const [values, setValues] = createSignal<readonly [number]>([0])
    const end = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeBindingId={added.binding.id}
        activeKeyformValues={values()}
        activeNodeId="deformer"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
        onEditEnd={end}
        previewDocument={createParameterPreview({
          document: document(),
          editingBindingId: added.binding.id,
          parameterValues: {[added.binding.parameterIds[0]]: values()[0]},
        })}
        targetNodeIds={['deformer']}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)
    if (tool === 'brush') {
      fireEvent.click(view.getByRole('button', {name: '디포머 변형 브러시'}))
    }
    const handle = tool === 'brush' ? svg : view.getByRole('button', {name: '자유 변형 회전 핸들'})
    fireEvent(
      handle,
      pointer('pointerdown', {
        bubbles: true,
        clientX: tool === 'brush' ? 75 : 330,
        clientY: tool === 'brush' ? 75 : 170,
      }),
    )
    fireEvent(
      svg,
      pointer('pointermove', {
        bubbles: true,
        clientX: tool === 'brush' ? 105 : 300,
        clientY: tool === 'brush' ? 75 : 170,
      }),
    )
    const beforeSwitch = document()
    setValues([30])
    fireEvent(svg, pointer('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
    fireEvent(svg, pointer('pointerup', {bubbles: true}))
    expect(document()).toBe(beforeSwitch)
    expect(end).toHaveBeenCalledTimes(1)
  },
)
