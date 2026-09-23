/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {MeshEditor} from '../MeshEditor'
import {createDeformer, getSceneNode} from '../internal/scene-graph'

describe('MeshEditor', () => {
  test('should edit rest topology without selecting a keyform or creating one', () => {
    const initial = {...createDemoDocument(), motions: []}
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={initial}
        meshEditing
        editMode="parameter"
        onDocumentChange={onDocumentChange}
      />
    ))
    const svg = view.container.querySelector('svg')!
    const vertex = view.container.querySelectorAll('circle')[4]!
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
    fireEvent.pointerDown(vertex, {button: 0})
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 500, clientY: 360}))
    fireEvent.pointerUp(svg)
    expect(onDocumentChange).toHaveBeenCalledOnce()
    const updated: PuppetDocument = onDocumentChange.mock.calls[0]![0]
    expect(updated.parts[0]?.mesh.vertices).not.toEqual(initial.parts[0]?.mesh.vertices)
    expect(updated.parts[0]?.mesh.uvs).not.toEqual(initial.parts[0]?.mesh.uvs)
    expect(updated.parameterBindings?.[0]?.keyforms).toHaveLength(
      initial.parameterBindings![0]!.keyforms.length,
    )
    expect(updated.motions).toEqual([])
  })

  test('should cancel an unfinished mesh drag when the mode changes', () => {
    const [meshEditing, setMeshEditing] = createSignal(true)
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={{...createDemoDocument(), motions: []}}
        meshEditing={meshEditing()}
        editMode="parameter"
        onDocumentChange={onDocumentChange}
      />
    ))
    const svg = view.container.querySelector('svg')!
    fireEvent.pointerDown(view.container.querySelectorAll('circle')[4]!, {button: 0})
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 500, clientY: 360}))
    setMeshEditing(false)
    fireEvent.pointerUp(svg)
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test('should render the selected example layer mesh', () => {
    const view = render(() => (
      <MeshEditor activePartId="shape-circle" document={createDemoDocument()} />
    ))

    expect(view.container.querySelectorAll('circle')).toHaveLength(13)
    expect(view.container.querySelectorAll('polygon')).toHaveLength(12)
  })

  test('should render only every part selected through a group', () => {
    const view = render(() => (
      <MeshEditor
        document={createDemoDocument()}
        selectedPartIds={['shape-circle', 'shape-diamond']}
      />
    ))

    expect(view.container.querySelector('[data-part-id="mesh-preview"]')).toBeNull()
    expect(view.container.querySelector('[data-part-id="shape-circle"]')).not.toBeNull()
    expect(view.container.querySelector('[data-part-id="shape-diamond"]')).not.toBeNull()
    expect(view.container.querySelectorAll('circle')).toHaveLength(18)
    expect(view.container.querySelectorAll('polygon')).toHaveLength(16)
  })

  test('should identify parts clipped by the selected mask', () => {
    const document = createDemoDocument()
    const maskedDocument: PuppetDocument = {
      ...document,
      parts: document.parts.map((part) =>
        part.id === 'shape-circle' || part.id === 'shape-diamond'
          ? {...part, properties: {clippingMaskIds: ['mesh-preview']}}
          : part,
      ),
    }
    const view = render(() => <MeshEditor activePartId="mesh-preview" document={maskedDocument} />)

    const clippedCircle = view.container.querySelector('[data-clipped-part-id="shape-circle"]')
    const clippedDiamond = view.container.querySelector('[data-clipped-part-id="shape-diamond"]')
    const boundaryToggle = view.getByRole('button', {name: '마스크 경계 표시'})

    expect(clippedCircle?.querySelectorAll('.clipped-part-boundary')).toHaveLength(2)
    expect(clippedDiamond?.querySelectorAll('.clipped-part-boundary')).toHaveLength(2)
    expect(boundaryToggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(boundaryToggle)
    expect(boundaryToggle).toHaveAttribute('aria-pressed', 'false')
    expect(view.container.querySelector('[data-clipped-part-id]')).toBeNull()
    fireEvent.click(boundaryToggle)
    expect(view.container.querySelectorAll('[data-clipped-part-id]')).toHaveLength(2)
  })

  test('should scope mask preview clips to each editor instance', () => {
    const document = createDemoDocument()
    const view = render(() => (
      <>
        <MeshEditor activePartId="mesh-preview" document={document} />
        <MeshEditor activePartId="shape-circle" document={document} />
      </>
    ))
    const clips = [...view.container.querySelectorAll('clipPath')]
    const clipIds = clips.map((clip) => clip.id)
    const svgs = [...view.container.querySelectorAll('.mesh-editor > svg')]

    expect(new Set(clipIds).size).toBe(2)
    expect(svgs[0]).toHaveStyle(`--active-mask-clip: url("#${clipIds[0]}")`)
    expect(svgs[1]).toHaveStyle(`--active-mask-clip: url("#${clipIds[1]}")`)
  })

  test('should preserve holes as even-odd subpaths in a mask preview', () => {
    const source = createDemoDocument()
    const document: PuppetDocument = {
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'mesh-preview'
          ? {
              ...part,
              mesh: {
                ...part.mesh,
                boundaryLoops: [part.mesh.boundaryLoops![0]!, part.mesh.boundaryLoops![0]!],
              },
            }
          : part,
      ),
    }
    const view = render(() => <MeshEditor activePartId="mesh-preview" document={document} />)
    const clipPath = view.container.querySelector('clipPath')

    expect(clipPath?.querySelectorAll('path')).toHaveLength(1)
    expect(clipPath?.querySelector('path')).toHaveAttribute('clip-rule', 'evenodd')
    expect(clipPath?.querySelector('path')?.getAttribute('d')?.match(/M /gu)).toHaveLength(2)
  })

  test('should snap a nearby click onto the current mesh boundary', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onDocumentChange = vi.fn((nextDocument: PuppetDocument) => setDocument(nextDocument))
    const onVertexSelect = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={document()}
        onDocumentChange={onDocumentChange}
        onVertexSelect={onVertexSelect}
      />
    ))
    const svg = view.container.querySelector('svg')

    expect(svg).not.toBeNull()

    if (svg !== null) {
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
      fireEvent(svg, new MouseEvent('dblclick', {bubbles: true, clientX: 480, clientY: 116}))
    }

    expect(onDocumentChange).toHaveBeenCalledTimes(1)
    expect(onVertexSelect).toHaveBeenCalledOnce()
    expect(document().parts[0]?.mesh.vertices.slice(-2)).toEqual([320, 0])
    expect(document().parts[0]?.mesh.uvs.slice(-2)).toEqual([0.5, 0])
  })

  test('should move a vertex into the workspace outside the texture', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const view = render(() => <MeshEditor document={document()} onDocumentChange={setDocument} />)
    const svg = view.container.querySelector('svg')
    const firstCorner = view.container.querySelector('circle')

    expect(svg?.getAttribute('viewBox')).toBe('-160 -120 960 720')
    expect(firstCorner).not.toBeNull()

    if (svg !== null && firstCorner !== null) {
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
      fireEvent(firstCorner, new MouseEvent('pointerdown', {bubbles: true}))
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 80, clientY: 60}))
      fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
    }

    expect(document().parts[0]?.mesh.vertices.slice(0, 2)).toEqual([-80, -60])
  })

  test('should store a displayed drag in part-local coordinates below a deformer', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>({
      ...initialDocument,
      scene: {
        roots: [
          {
            bounds: {height: 480, width: 640, x: 0, y: 0},
            children: [initialDocument.scene!.roots[0]!],
            columns: 1,
            controlPoints: [0, 0, 0, 640, -480, 0, -480, 640],
            id: 'deformer',
            kind: 'deformer',
            locked: false,
            name: 'Deformer',
            rows: 1,
            visible: true,
          },
          ...initialDocument.scene!.roots.slice(1),
        ],
      },
    })
    const view = render(() => <MeshEditor document={document()} onDocumentChange={setDocument} />)
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

    expect(centerVertex?.getAttribute('cx')).toBe('-240')
    expect(centerVertex?.getAttribute('cy')).toBe('320')

    if (svg !== null && centerVertex !== undefined) {
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
      fireEvent.pointerDown(centerVertex, {button: 0})
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: -40, clientY: 460}))
      fireEvent.pointerUp(svg)
    }

    expect(document().parts[0]?.mesh.vertices.at(-2)).toBeCloseTo(340)
    expect(document().parts[0]?.mesh.vertices.at(-1)).toBeCloseTo(200)
  })

  test.each([0, 0.5, 1])('should edit the original selected keyform at influence %s', (weight) => {
    const source = createDemoDocument()
    const initialDocument = {
      ...source,
      parameterBindings: source.parameterBindings!.map((binding) => ({
        ...binding,
        influences: [{parameterId: 'angle-y', points: [{value: 0, weight}]}],
      })),
    }
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const view = render(() => (
      <MeshEditor
        activeBindingId="angle-xy"
        activeKeyformValues={[30, 0]}
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
        parameterValues={[30, 0]}
      />
    ))
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

    expect(centerVertex?.getAttribute('cx')).toBe('384')

    if (svg !== null && centerVertex !== undefined) {
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
      fireEvent(centerVertex, new MouseEvent('pointerdown', {bubbles: true}))
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 500, clientY: 360}))
      fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
    }

    expect(document().parts[0]?.mesh.vertices).toBe(initialDocument.parts[0]?.mesh.vertices)
    expect(
      document()
        .parameterBindings?.[0]?.keyforms.find(
          (keyform) => keyform.values[0] === 30 && keyform.values[1] === 0,
        )
        ?.parts[0]?.vertices.slice(-2),
    ).toEqual([340, 240])
    expect(document().parameterBindings?.[0]?.influences?.[0]?.points[0]?.weight).toBe(weight)
  })

  test('should remove a corner from both controls and rendered geometry', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onDocumentChange = vi.fn((nextDocument: PuppetDocument) => setDocument(nextDocument))
    const view = render(() => (
      <MeshEditor document={document()} onDocumentChange={onDocumentChange} />
    ))
    const firstCorner = view.container.querySelector('circle')

    expect(firstCorner).not.toBeNull()
    expect(view.container.querySelectorAll('circle')).toHaveLength(5)
    expect(view.container.querySelectorAll('[data-part-id="mesh-preview"] polygon')).toHaveLength(4)

    if (firstCorner !== null) {
      fireEvent.pointerDown(firstCorner, {button: 0})
      fireEvent.keyDown(view.getByLabelText('메시 정점 편집 영역'), {key: 'Backspace'})
    }

    expect(onDocumentChange).toHaveBeenCalledTimes(1)
    expect(view.container.querySelectorAll('circle')).toHaveLength(4)
    expect(view.container.querySelectorAll('[data-part-id="mesh-preview"] polygon')).toHaveLength(2)
    expect(document().parts[0]?.mesh.vertices).toHaveLength(8)
    expect(document().parts[0]?.mesh.indices).toHaveLength(6)
    expect(document().parts[0]?.mesh.vertices).not.toBe(initialDocument.parts[0]?.mesh.vertices)
    expect(document().parts[0]?.mesh.indices).not.toBe(initialDocument.parts[0]?.mesh.indices)
  })
})

test('should ignore double clicks on vertices and clear selection on empty clicks', () => {
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <MeshEditor document={createDemoDocument()} onDocumentChange={onDocumentChange} />
  ))
  const vertex = view.container.querySelector('circle')!
  const canvas = view.getByLabelText('메시 정점 편집 영역')
  fireEvent.pointerDown(vertex, {button: 0})
  expect(vertex).toHaveClass('selected')
  fireEvent.dblClick(vertex)
  expect(onDocumentChange).not.toHaveBeenCalled()
  fireEvent.click(canvas)
  expect(vertex).not.toHaveClass('selected')
  fireEvent.keyDown(canvas, {key: 'Backspace'})
  expect(onDocumentChange).not.toHaveBeenCalled()
})

test('should keep deletion scoped to the focused canvas and ignore composing keys', () => {
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <>
      <input aria-label="이름" />
      <MeshEditor document={createDemoDocument()} onDocumentChange={onDocumentChange} />
    </>
  ))
  fireEvent.pointerDown(view.container.querySelector('circle')!, {button: 0})
  const canvas = view.getByLabelText('메시 정점 편집 영역')
  fireEvent.keyDown(view.getByLabelText('이름'), {key: 'Backspace'})
  fireEvent.keyDown(canvas, {isComposing: true, key: 'Delete'})
  fireEvent.keyDown(canvas, {key: 'Delete', repeat: true})
  expect(onDocumentChange).not.toHaveBeenCalled()
  fireEvent.keyDown(canvas, {key: 'Delete'})
  expect(onDocumentChange).toHaveBeenCalledOnce()
})
