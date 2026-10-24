/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {DeformerEditor} from '../DeformerEditor'
import {createDeformerControlSelection} from '../deformer-control-selection'
import {getSceneNode} from '../scene-graph'
import {
  createDeformer,
  createDocument,
  getEditorSvg,
  mockViewportBounds,
} from './fixtures/deformer-editor'

describe('DeformerEditor selection', () => {
  test('should select multiple control points additively and keep rotation controls exclusive', () => {
    const controlSelection = createDeformerControlSelection()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        controlSelection={controlSelection}
        document={createDocument(createDeformer())}
      />
    ))
    const firstPoint = view.getByRole('button', {name: /^격자 제어점 1$/})
    const secondPoint = view.getByRole('button', {name: /^격자 제어점 2$/})
    const rotationHandle = view.getByRole('button', {name: '자유 변형 회전 핸들'})
    const rotationOrigin = view.getByRole('button', {name: '자유 변형 회전 중심'})
    const rotationOriginIndicator = view.container.querySelector('.rotation-origin')

    expect(firstPoint).toHaveAttribute('aria-pressed', 'false')
    expect(firstPoint).not.toHaveClass('selected')

    fireEvent(firstPoint, new MouseEvent('pointerdown', {bubbles: true}))

    expect(firstPoint).toHaveAttribute('aria-pressed', 'true')
    expect(firstPoint).toHaveClass('selected')
    expect(controlSelection.selectedPointIndices()).toEqual([0])

    fireEvent(secondPoint, new MouseEvent('pointerdown', {bubbles: true, ctrlKey: true}))

    expect(firstPoint).toHaveAttribute('aria-pressed', 'true')
    expect(firstPoint).toHaveClass('selected')
    expect(secondPoint).toHaveAttribute('aria-pressed', 'true')
    expect(secondPoint).toHaveClass('selected')
    expect(controlSelection.selectedPointIndices()).toEqual([0, 1])

    fireEvent(firstPoint, new MouseEvent('pointerdown', {bubbles: true, metaKey: true}))

    expect(firstPoint).toHaveAttribute('aria-pressed', 'false')
    expect(firstPoint).not.toHaveClass('selected')
    expect(secondPoint).toHaveAttribute('aria-pressed', 'true')
    expect(controlSelection.selectedPointIndices()).toEqual([1])

    fireEvent(firstPoint, new MouseEvent('pointerdown', {bubbles: true}))

    expect(firstPoint).toHaveAttribute('aria-pressed', 'true')
    expect(secondPoint).toHaveAttribute('aria-pressed', 'false')
    expect(controlSelection.selectedPointIndices()).toEqual([0])

    fireEvent(rotationHandle, new MouseEvent('pointerdown', {bubbles: true}))

    expect(firstPoint).toHaveAttribute('aria-pressed', 'false')
    expect(firstPoint).not.toHaveClass('selected')
    expect(rotationHandle).toHaveAttribute('aria-pressed', 'true')
    expect(rotationHandle).toHaveClass('selected')
    expect(controlSelection.selectedPointIndices()).toEqual([])

    fireEvent(rotationOrigin, new MouseEvent('pointerdown', {bubbles: true}))

    expect(rotationHandle).toHaveAttribute('aria-pressed', 'false')
    expect(rotationHandle).not.toHaveClass('selected')
    expect(rotationOrigin).toHaveAttribute('aria-pressed', 'true')
    expect(rotationOriginIndicator).toHaveClass('selected')
  })

  test('should select control points and rotation controls with the keyboard', () => {
    const controlSelection = createDeformerControlSelection()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        controlSelection={controlSelection}
        document={createDocument(createDeformer())}
      />
    ))
    const firstPoint = view.getByRole('button', {name: /^격자 제어점 1$/})
    const secondPoint = view.getByRole('button', {name: /^격자 제어점 2$/})
    const rotationHandle = view.getByRole('button', {name: '자유 변형 회전 핸들'})
    const rotationOrigin = view.getByRole('button', {name: '자유 변형 회전 중심'})

    fireEvent.keyDown(firstPoint, {key: 'Enter'})
    fireEvent.keyDown(secondPoint, {ctrlKey: true, key: ' '})

    expect(firstPoint).toHaveAttribute('aria-pressed', 'true')
    expect(secondPoint).toHaveAttribute('aria-pressed', 'true')
    expect(controlSelection.selectedPointIndices()).toEqual([0, 1])
    expect(rotationHandle).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(rotationHandle, {key: 'Enter'})
    expect(rotationHandle).toHaveAttribute('aria-pressed', 'true')
    expect(controlSelection.selectedPointIndices()).toEqual([])

    fireEvent.keyDown(rotationOrigin, {key: ' '})
    expect(rotationOrigin).toHaveAttribute('aria-pressed', 'true')
    expect(rotationHandle).toHaveAttribute('aria-pressed', 'false')
  })

  test('should clear control selection when the active deformer or grid changes', () => {
    const firstDeformer = {...createDeformer(), id: 'first-deformer'}
    const secondDeformer = {...createDeformer([]), id: 'second-deformer'}
    const [document, setDocument] = createSignal({
      ...createDemoDocument(),
      scene: {roots: [firstDeformer, secondDeformer]},
    })
    const [activeNodeId, setActiveNodeId] = createSignal(firstDeformer.id)
    const controlSelection = createDeformerControlSelection()
    const view = render(() => (
      <DeformerEditor
        activeNodeId={activeNodeId()}
        controlSelection={controlSelection}
        document={document()}
      />
    ))
    const firstPoint = view.getByRole('button', {name: /^격자 제어점 1$/})

    fireEvent(firstPoint, new MouseEvent('pointerdown', {bubbles: true}))
    expect(firstPoint).toHaveAttribute('aria-pressed', 'true')

    setActiveNodeId(secondDeformer.id)
    setActiveNodeId(firstDeformer.id)

    expect(view.getByRole('button', {name: /^격자 제어점 1$/})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(controlSelection.selectedPointIndices()).toEqual([])

    fireEvent(
      view.getByRole('button', {name: /^격자 제어점 1$/}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    setDocument({
      ...document(),
      scene: {
        roots: [
          {
            ...firstDeformer,
            columns: 2,
            controlPoints: [0, 0, 50, 0, 100, 0, 0, 100, 50, 100, 100, 100],
          },
          secondDeformer,
        ],
      },
    })

    expect(view.getByRole('button', {name: /^격자 제어점 1$/})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(controlSelection.selectedPointIndices()).toEqual([])
  })

  test('should show curve handles only for selected control points and keep them while dragging', () => {
    const initialDeformer = {
      ...createDeformer(),
      curveHandles: [
        {
          horizontal: {x: 100 / 3, y: 0},
          pointIndex: 0,
          vertical: {x: 0, y: 100 / 3},
        },
        {
          horizontal: {x: 400 / 3, y: 0},
          pointIndex: 1,
          vertical: {x: 100, y: 100 / 3},
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

    expect(view.queryAllByRole('button', {name: /곡률 핸들/})).toHaveLength(0)

    fireEvent(
      view.getByRole('button', {name: '격자 제어점 1'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )

    expect(view.getByRole('button', {name: '격자 제어점 1 세로 곡률 핸들'})).toBeVisible()
    expect(view.queryByRole('button', {name: '격자 제어점 2 세로 곡률 핸들'})).toBeNull()

    fireEvent(
      view.getByRole('button', {name: '격자 제어점 2'}),
      new MouseEvent('pointerdown', {bubbles: true, ctrlKey: true}),
    )

    expect(view.getByRole('button', {name: '격자 제어점 1 세로 곡률 핸들'})).toBeVisible()
    expect(view.getByRole('button', {name: '격자 제어점 2 세로 곡률 핸들'})).toBeVisible()

    fireEvent(
      view.getByRole('button', {name: '격자 제어점 1 가로 곡률 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    expect(view.getByRole('button', {name: '격자 제어점 1 가로 곡률 핸들'})).toBeVisible()
    expect(view.getByRole('button', {name: '격자 제어점 2 가로 곡률 핸들'})).toBeVisible()
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 180}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const deformer = getSceneNode(document(), 'deformer')
    expect(
      deformer?.kind === 'deformer' ? deformer.curveHandles?.[0]?.horizontal : undefined,
    ).toEqual({x: 50, y: 60})
  })
})
