/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../../player'
import {DeformerEditor} from '../internal/DeformerEditor'
import {addParameter, insertParameterKeyform} from '../internal/parameter-keyforms'
import {createParameterPreview} from '../internal/parameter-sampling'
import {getSceneNode} from '../internal/scene-graph'

const partNode: PuppetSceneNode = {
  id: 'mesh-preview',
  kind: 'part',
  locked: false,
  name: 'Part',
  visible: true,
}

const createDeformer = (
  children: ReadonlyArray<PuppetSceneNode> = [partNode],
): PuppetSceneDeformerNode => ({
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children,
  columns: 1,
  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
  id: 'deformer',
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rows: 1,
  visible: true,
})

const createDocument = (root: PuppetSceneNode): PuppetDocument => ({
  ...createDemoDocument(),
  scene: {roots: [root]},
})

const mockViewportBounds = (svg: SVGSVGElement) =>
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

const getEditorSvg = (container: HTMLElement) => {
  const svg = container.querySelector<SVGSVGElement>('svg')

  if (svg === null) {
    throw new Error('Expected the deformer editor SVG to render.')
  }

  return svg
}

describe('DeformerEditor', () => {
  test('should rotate and translate all control points', () => {
    const [document, setDocument] = createSignal(createDocument(createDeformer()))
    const onEditStart = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
        onEditStart={onEditStart}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    fireEvent(
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const rotated = getSceneNode(document(), 'deformer')
    const rotatedPoints = rotated?.kind === 'deformer' ? rotated.controlPoints : []
    expect(rotatedPoints[0]).toBeCloseTo(100)
    expect(rotatedPoints[1]).toBeCloseTo(0)
    expect(rotatedPoints[2]).toBeCloseTo(100)
    expect(rotatedPoints[3]).toBeCloseTo(100)

    fireEvent(
      view.getByRole('button', {name: '자유 변형 중심'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 180, clientY: 150}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const moved = getSceneNode(document(), 'deformer')
    const movedPoints = moved?.kind === 'deformer' ? moved.controlPoints : []
    expect(movedPoints[0]).toBeCloseTo(70)
    expect(movedPoints[1]).toBeCloseTo(-20)
    expect(movedPoints[2]).toBeCloseTo(70)
    expect(movedPoints[3]).toBeCloseTo(80)
    expect(onEditStart).toHaveBeenCalledTimes(2)
  })

  test('should drag a control point', () => {
    const [document, setDocument] = createSignal(createDocument(createDeformer()))
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    fireEvent(
      view.getByRole('button', {name: '격자 제어점 1'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 185, clientY: 155}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const deformer = getSceneNode(document(), 'deformer')
    expect(deformer?.kind === 'deformer' ? deformer.controlPoints.slice(0, 2) : []).toEqual([
      25, 35,
    ])
  })

  test('should drag optional horizontal and vertical curve handles', () => {
    const initialDeformer = {
      ...createDeformer(),
      curveHandles: [
        {
          horizontal: {x: 100 / 3, y: 0},
          pointIndex: 0,
          vertical: {x: 0, y: 100 / 3},
        },
      ],
    }
    const [document, setDocument] = createSignal(createDocument(initialDeformer))
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    expect(view.getByRole('button', {name: '격자 제어점 1 세로 곡률 핸들'})).toBeVisible()
    fireEvent(
      view.getByRole('button', {name: '격자 제어점 1 가로 곡률 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 180}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const deformer = getSceneNode(document(), 'deformer')
    expect(
      deformer?.kind === 'deformer' ? deformer.curveHandles?.[0]?.horizontal : undefined,
    ).toEqual({x: 50, y: 60})
  })

  test('should move a control point with the keyboard', () => {
    const [document, setDocument] = createSignal(createDocument(createDeformer()))
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
      />
    ))
    const point = view.getByRole('button', {name: '격자 제어점 1'})

    expect(point).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(point, {key: 'ArrowRight', shiftKey: true})
    fireEvent.keyDown(point, {key: 'ArrowDown'})

    const deformer = getSceneNode(document(), 'deformer')
    expect(deformer?.kind === 'deformer' ? deformer.controlPoints.slice(0, 2) : []).toEqual([10, 1])
  })

  test('should explain and block editing for a locked deformer', () => {
    const document = createDocument({...createDeformer(), locked: true})
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document}
        onDocumentChange={onDocumentChange}
      />
    ))
    const point = view.getByRole('button', {name: '격자 제어점 1'})

    expect(view.getByRole('status')).toHaveTextContent('잠긴 디포머는 편집할 수 없습니다.')
    expect(point).toHaveAttribute('aria-disabled', 'true')
    expect(point).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(point, {key: 'ArrowRight'})
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test('should render and store points through parent deformer coordinates', () => {
    const parent = {
      ...createDeformer([createDeformer()]),
      controlPoints: [0, 0, 0, 100, -100, 0, -100, 100],
      id: 'parent',
    }
    const [document, setDocument] = createSignal(createDocument(parent))
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
      />
    ))
    const svg = getEditorSvg(view.container)
    const secondPoint = view.getByRole('button', {name: '격자 제어점 2'})
    mockViewportBounds(svg)

    expect(Number(secondPoint.getAttribute('cx'))).toBeCloseTo(0)
    expect(Number(secondPoint.getAttribute('cy'))).toBeCloseTo(100)

    fireEvent(secondPoint, new MouseEvent('pointerdown', {bubbles: true}))
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 160, clientY: 240}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const deformer = getSceneNode(document(), 'deformer')
    const movedPoint = deformer?.kind === 'deformer' ? deformer.controlPoints.slice(2, 4) : []
    expect(movedPoint[0]).toBeCloseTo(120)
    expect(movedPoint[1]).toBeCloseTo(0)
  })

  test('should edit the selected parameter keyform without changing the rest deformer', () => {
    const initial = {
      ...createDocument(createDeformer()),
      motions: [],
      parameterBindings: [],
      parameters: [],
    }
    const added = addParameter({document: initial, nodeIds: ['deformer']})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const [document, setDocument] = createSignal(inserted)
    const view = render(() => (
      <DeformerEditor
        activeBindingId={added.binding.id}
        activeKeyformValues={[30]}
        activeNodeId="deformer"
        document={document()}
        editMode="parameter"
        previewDocument={createParameterPreview({
          document: document(),
          parameterValues: {[added.binding.parameterIds[0]]: 30},
        })}
        onDocumentChange={setDocument}
        targetNodeIds={['deformer']}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    fireEvent(
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const rest = getSceneNode(document(), 'deformer')
    const keyform = document()
      .parameterBindings?.find((binding) => binding.id === added.binding.id)
      ?.keyforms.find((candidate) => candidate.values[0] === 30)
      ?.deformers?.find((candidate) => candidate.nodeId === 'deformer')
    expect(rest?.kind === 'deformer' ? rest.controlPoints.slice(0, 4) : []).toEqual([0, 0, 100, 0])
    expect(keyform?.controlPoints[0]).toBeCloseTo(100)
    expect(keyform?.controlPoints[1]).toBeCloseTo(0)
    expect(keyform?.controlPoints[2]).toBeCloseTo(100)
    expect(keyform?.controlPoints[3]).toBeCloseTo(100)
  })

  test('should explain and block editing outside the active parameter', () => {
    const document = createDocument(createDeformer())
    const binding = document.parameterBindings?.[0]
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeBindingId={binding?.id}
        activeKeyformValues={binding?.keyforms[0]?.values}
        activeNodeId="deformer"
        document={document}
        editMode="parameter"
        onDocumentChange={onDocumentChange}
        previewDocument={document}
        targetNodeIds={binding?.targetPartIds}
      />
    ))
    const point = view.getByRole('button', {name: '격자 제어점 1'})

    expect(view.getByRole('status')).toHaveTextContent(
      '현재 Parameter에 연결되지 않은 디포머입니다. 아래의 ‘선택 레이어 연결’을 누르세요.',
    )
    expect(point).toHaveAttribute('aria-disabled', 'true')
    fireEvent.keyDown(point, {key: 'ArrowRight'})
    expect(onDocumentChange).not.toHaveBeenCalled()
  })
})
