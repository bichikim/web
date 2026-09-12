/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {transformDeformerPoint} from '../../../deformation'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetSceneDeformerNode} from '../../../player'
import {DeformerEditor} from '../DeformerEditor'
import {getSceneNode} from '../scene-graph'
import {
  createDeformer,
  createDocument,
  getEditorSvg,
  mockViewportBounds,
} from './fixtures/deformer-editor'

describe('DeformerEditor', () => {
  test('should rotate with the angle handle and translate from the deformer interior', () => {
    const [document, setDocument] = createSignal(createDocument(createDeformer()))
    const onEditEnd = vi.fn()
    const onEditStart = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
        onEditEnd={onEditEnd}
        onEditStart={onEditStart}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    fireEvent(
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true, clientX: 330, clientY: 170}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const rotated = getSceneNode(document(), 'deformer')
    const rotatedPoints = rotated?.kind === 'deformer' ? rotated.controlPoints : []
    expect(rotatedPoints[0]).toBeCloseTo(100)
    expect(rotatedPoints[1]).toBeCloseTo(0)
    expect(rotatedPoints[2]).toBeCloseTo(100)
    expect(rotatedPoints[3]).toBeCloseTo(100)

    const rotationOrigin = view.getByRole('button', {name: '자유 변형 회전 중심'})
    const rotationOriginIndicator = view.container.querySelector('.rotation-origin')
    const translationHandle = view.container.querySelector('.translation-handle')

    expect(rotationOrigin).toHaveAttribute('r', '15')
    expect(rotationOrigin).not.toHaveAttribute('stroke-width')
    expect(rotationOrigin).toHaveAttribute('pointer-events', 'all')
    expect(rotationOriginIndicator).toHaveAttribute('aria-hidden', 'true')
    expect(rotationOriginIndicator).toHaveAttribute('pointer-events', 'none')
    expect(translationHandle).not.toBeNull()

    fireEvent(
      rotationOrigin,
      new MouseEvent('pointerdown', {bubbles: true, clientX: 210, clientY: 170}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 220, clientY: 180}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const movedOrigin = getSceneNode(document(), 'deformer')
    expect(movedOrigin?.kind === 'deformer' ? movedOrigin.controlPoints : []).toEqual(rotatedPoints)
    expect(movedOrigin?.kind === 'deformer' ? movedOrigin.rotationOrigin : undefined).toEqual({
      x: 60,
      y: 60,
    })

    fireEvent(
      translationHandle!,
      new MouseEvent('pointerdown', {bubbles: true, clientX: 210, clientY: 170}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 220, clientY: 180}))
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 230, clientY: 190}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const moved = getSceneNode(document(), 'deformer')
    const movedPoints = moved?.kind === 'deformer' ? moved.controlPoints : []
    expect(movedPoints[0]).toBeCloseTo(120)
    expect(movedPoints[1]).toBeCloseTo(20)
    expect(movedPoints[2]).toBeCloseTo(120)
    expect(movedPoints[3]).toBeCloseTo(120)
    expect(moved?.kind === 'deformer' ? moved.rotationOrigin : undefined).toEqual({x: 80, y: 80})
    expect(onEditStart).toHaveBeenCalledTimes(3)
    expect(onEditEnd).toHaveBeenCalledTimes(3)
  })

  test('should preserve the rotation grab offset and stop when capture is lost', () => {
    const initial = createDocument(createDeformer())
    const [document, setDocument] = createSignal(initial)
    const onEditEnd = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document()}
        onDocumentChange={setDocument}
        onEditEnd={onEditEnd}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)
    const capture = vi.fn()
    Object.defineProperty(svg, 'setPointerCapture', {value: capture})
    const pointer = (type: string, x: number, y: number, id = 7) => {
      const event = new MouseEvent(type, {bubbles: true, clientX: x, clientY: y})
      Object.defineProperty(event, 'pointerId', {value: id})
      return event
    }
    fireEvent(
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      pointer('pointerdown', 328, 176),
    )
    expect(capture).toHaveBeenCalledWith(7)
    fireEvent(svg, pointer('pointermove', 328, 176))
    expect(getSceneNode(document(), 'deformer')).toEqual(getSceneNode(initial, 'deformer'))
    fireEvent(svg, pointer('pointermove', 204, 288))
    const rotated = getSceneNode(document(), 'deformer')
    expect(rotated?.kind === 'deformer' ? rotated.controlPoints[0] : undefined).toBeCloseTo(100)
    fireEvent(svg, pointer('pointermove', 204, 288))
    expect(getSceneNode(document(), 'deformer')).toEqual(rotated)
    fireEvent(svg, pointer('pointermove', 500, 400, 8))
    fireEvent(svg, pointer('pointerup', 500, 400, 8))
    expect(getSceneNode(document(), 'deformer')).toEqual(rotated)
    expect(onEditEnd).not.toHaveBeenCalled()
    fireEvent(svg, pointer('lostpointercapture', 204, 288))
    fireEvent(svg, pointer('pointermove', 328, 176))
    expect(getSceneNode(document(), 'deformer')).toEqual(rotated)
    expect(onEditEnd).toHaveBeenCalledTimes(1)
  })

  test('should rotate around an independent rotation origin', () => {
    const [document, setDocument] = createSignal(
      createDocument({...createDeformer(), rotationOrigin: {x: 0, y: 0}}),
    )
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
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true, clientX: 280, clientY: 120}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 160, clientY: 220}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const rotated = getSceneNode(document(), 'deformer')
    const rotatedPoints = rotated?.kind === 'deformer' ? rotated.controlPoints : []
    expect(rotatedPoints[0]).toBeCloseTo(0)
    expect(rotatedPoints[1]).toBeCloseTo(0)
    expect(rotatedPoints[2]).toBeCloseTo(0)
    expect(rotatedPoints[3]).toBeCloseTo(100)
    expect(rotatedPoints[4]).toBeCloseTo(-100)
    expect(rotatedPoints[5]).toBeCloseTo(0)
    expect(rotatedPoints[6]).toBeCloseTo(-100)
    expect(rotatedPoints[7]).toBeCloseTo(100)
    expect(rotated?.kind === 'deformer' ? rotated.rotationOrigin : undefined).toEqual({x: 0, y: 0})
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
    expect(deformer?.kind === 'deformer' ? deformer.rotationOrigin : undefined).toEqual({
      x: 50,
      y: 50,
    })
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
})

test('should edit a curve handle through the keyboard', () => {
  const curve: PuppetSceneDeformerNode = {
    ...createDeformer(),
    controlPoints: [0, 50, 100 / 3, 50, 200 / 3, 50, 100, 50],
    curveAxis: 'x',
  }
  const [document, setDocument] = createSignal(createDocument(curve))
  const view = render(() => (
    <DeformerEditor document={document()} activeNodeId="deformer" onDocumentChange={setDocument} />
  ))
  expect(view.queryByLabelText('자유 변형 회전 중심')).toBeNull()
  expect(view.queryByLabelText('자유 변형 회전 핸들')).toBeNull()
  fireEvent.keyDown(view.getByRole('button', {name: '곡선 핸들 2'}), {key: 'ArrowDown'})
  const node = getSceneNode(document(), 'deformer')
  expect(node?.kind === 'deformer' && node.controlPoints[3]).toBe(51)
  expect(view.getByRole('button', {name: '곡선 제어점 4'})).toBeDefined()
})

test.each(['Backspace', 'Delete'])(
  'should split a curve at the double click and remove its selected knot with %s',
  (key) => {
    const curve: PuppetSceneDeformerNode = {
      ...createDeformer(),
      controlPoints: [0, 50, 100 / 3, 50, 200 / 3, 50, 100, 50],
      curveAxis: 'x',
    }
    const [document, setDocument] = createSignal(createDocument(curve))
    const view = render(() => (
      <DeformerEditor
        document={document()}
        activeNodeId="deformer"
        onDocumentChange={setDocument}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)
    // The demo view box maps model (25, 50) to client (185, 170).
    fireEvent.dblClick(view.getByLabelText('곡선 연결점 추가 영역'), {clientX: 185, clientY: 170})
    const node = getSceneNode(document(), 'deformer')
    expect(node?.kind === 'deformer' && node.curveBreaks?.[1]).toBeCloseTo(0.25)
    expect(view.getAllByRole('button', {name: /곡선 (제어점|핸들)/})).toHaveLength(7)
    fireEvent.keyDown(svg, {key, repeat: true})
    expect(view.getAllByRole('button', {name: /곡선 (제어점|핸들)/})).toHaveLength(7)
    fireEvent.keyDown(svg, {key})
    expect(view.getAllByRole('button', {name: /곡선 (제어점|핸들)/})).toHaveLength(4)
    fireEvent.keyDown(view.getByLabelText('곡선 제어점 1'), {key: 'Enter'})
    fireEvent.keyDown(svg, {key})
    expect(view.getAllByRole('button', {name: /곡선 (제어점|핸들)/})).toHaveLength(4)
  },
)

test('should move only the control layout in placement mode and deform again after switching back', () => {
  const source = createDeformer()
  const [document, setDocument] = createSignal(createDocument(source))
  const view = render(() => (
    <DeformerEditor document={document()} activeNodeId="deformer" onDocumentChange={setDocument} />
  ))
  fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
  fireEvent.keyDown(view.getByRole('button', {name: '격자 제어점 1'}), {
    key: 'ArrowRight',
    shiftKey: true,
  })
  const placed = getSceneNode(document(), 'deformer') as PuppetSceneDeformerNode
  expect(placed.controlPoints[0]).toBe(10)
  expect(transformDeformerPoint(placed, {x: 20, y: 30})).toEqual(
    transformDeformerPoint(source, {x: 20, y: 30}),
  )
  fireEvent.click(view.getByRole('button', {name: '변형 편집'}))
  fireEvent.keyDown(view.getByRole('button', {name: '격자 제어점 1'}), {
    key: 'ArrowDown',
    shiftKey: true,
  })
  const posed = getSceneNode(document(), 'deformer') as PuppetSceneDeformerNode
  expect(transformDeformerPoint(posed, {x: 20, y: 30}).y).toBeGreaterThan(30)
})

test('should end a drag before switching the selected deformer', () => {
  const first = createDeformer()
  const second = {
    ...createDeformer(),
    controlPoints: first.controlPoints.map((value) => value + 200),
    id: 'second',
  }
  const [document, setDocument] = createSignal({
    ...createDocument(first),
    scene: {roots: [first, second]},
  })
  const [active, setActive] = createSignal(first.id)
  const onEditEnd = vi.fn()
  const view = render(() => (
    <DeformerEditor
      document={document()}
      activeNodeId={active()}
      onDocumentChange={setDocument}
      onEditEnd={onEditEnd}
    />
  ))
  const svg = getEditorSvg(view.container)
  mockViewportBounds(svg)
  fireEvent(
    view.getByRole('button', {name: '자유 변형 회전 핸들'}),
    new MouseEvent('pointerdown', {bubbles: true, clientX: 330, clientY: 170}),
  )
  setActive('second')
  const before = document()
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
  expect(document()).toBe(before)
  expect(onEditEnd).toHaveBeenCalledTimes(1)
})

test('should expose and edit influence masks for pin, curve and grid deformers', async () => {
  const {convertSceneContainers} = await import('../container-conversion')
  for (const targetKind of ['pin', 'curve', 'deformer'] as const) {
    const [document, setDocument] = createSignal(
      convertSceneContainers({document: createDemoDocument(), nodeIds: ['shapes'], targetKind})!,
    )
    const view = render(() => (
      <DeformerEditor document={document()} activeNodeId="shapes" onDocumentChange={setDocument} />
    ))
    fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
    fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
    fireEvent.click(view.getByRole('button', {name: 'shape-circle 정점 1'}))
    fireEvent.input(view.getByRole('spinbutton', {name: '디포머 영향도'}), {target: {value: '25'}})
    expect(getSceneNode(document(), 'shapes')).toMatchObject({vertexInfluences: [{weight: 0.25}]})
    expect(view.queryByRole('button', {name: '칠할 본 1'})).toBeNull()
    view.unmount()
  }
})
