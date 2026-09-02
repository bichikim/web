/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {MeshEditor} from '../MeshEditor'

describe('MeshEditor', () => {
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

  test('should render animated vertices without mutating the source mesh', () => {
    const document = createDemoDocument()
    const [previewTime, setPreviewTime] = createSignal(0)
    const sourceVertices = [...document.parts[0]!.mesh.vertices]
    const view = render(() => <MeshEditor document={document} previewTime={previewTime()} />)
    const centerVertex = view.container.querySelectorAll('circle')[4]

    expect(centerVertex?.getAttribute('cx')).toBe('320')
    expect(centerVertex?.getAttribute('cy')).toBe('240')

    setPreviewTime(1)

    expect(view.container.querySelectorAll('circle')[4]).toBe(centerVertex)
    expect(centerVertex?.getAttribute('cy')).toBe('176')
    expect(document.parts[0]?.mesh.vertices).toEqual(sourceVertices)
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
      fireEvent.click(view.getByRole('button', {name: '정점 추가'}))
      fireEvent(svg, new MouseEvent('click', {bubbles: true, clientX: 480, clientY: 116}))
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

  test('should select a vertex without creating a keyframe when it does not move', () => {
    const document = createDemoDocument()
    const onDocumentChange = vi.fn()
    const onVertexSelect = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={document}
        onDocumentChange={onDocumentChange}
        onVertexSelect={onVertexSelect}
        previewTime={0.5}
      />
    ))
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

    if (svg !== null && centerVertex !== undefined) {
      fireEvent.pointerDown(centerVertex, {button: 0})
      fireEvent.pointerUp(svg)
    }

    expect(onVertexSelect).toHaveBeenCalledWith(4)
    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(document.motions[0]?.tracks).toHaveLength(1)
    expect(centerVertex).toHaveClass('selected')
    expect(view.getByRole('button', {name: '정점 삭제'})).toBeEnabled()
  })

  test('should ignore a secondary-button pointer gesture on a vertex', () => {
    const document = createDemoDocument()
    const onDocumentChange = vi.fn()
    const onVertexEditStart = vi.fn()
    const onVertexSelect = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={document}
        onDocumentChange={onDocumentChange}
        onVertexEditStart={onVertexEditStart}
        onVertexSelect={onVertexSelect}
        previewTime={0.5}
      />
    ))
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

    if (svg !== null && centerVertex !== undefined) {
      fireEvent(centerVertex, new MouseEvent('pointerdown', {bubbles: true, button: 2}))
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 500, clientY: 360}))
      fireEvent(svg, new MouseEvent('pointerup', {bubbles: true, button: 2}))
    }

    expect(onVertexSelect).not.toHaveBeenCalled()
    expect(onVertexEditStart).not.toHaveBeenCalled()
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test('should cancel an active vertex drag when its document is replaced', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onDocumentChange = vi.fn((nextDocument: PuppetDocument) => setDocument(nextDocument))
    const view = render(() => (
      <MeshEditor document={document()} onDocumentChange={onDocumentChange} previewTime={0.5} />
    ))
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

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
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 500, clientY: 360}))
      setDocument({...initialDocument, viewport: {...initialDocument.viewport}})
      fireEvent.pointerUp(svg)
    }

    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(document().motions[0]?.tracks).toHaveLength(1)
  })

  test('should store an animated drag as a keyframe without changing rest vertices', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onVertexEditStart = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={document()}
        onDocumentChange={setDocument}
        onVertexEditStart={onVertexEditStart}
        previewTime={0.5}
      />
    ))
    const svg = view.container.querySelector('svg')
    const centerVertex = view.container.querySelectorAll('circle')[4]

    expect(centerVertex).not.toBeNull()

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
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 480, clientY: 320}))
      fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
    }

    expect(onVertexEditStart).toHaveBeenCalledOnce()
    expect(document().parts[0]?.mesh.vertices).toBe(initialDocument.parts[0]?.mesh.vertices)
    const vertexTracks = document().motions[0]?.tracks.filter((track) => !('parameterId' in track))
    expect(vertexTracks?.[0]?.keyframes[0]).toEqual({time: 0.5, value: 320})
    expect(vertexTracks?.[1]?.keyframes).toEqual([{time: 0.5, value: 200}])
  })

  test('should edit only an explicitly selected parameter keyform', () => {
    const initialDocument = createDemoDocument()
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
    expect(view.getByRole('button', {name: '정점 추가'})).toBeDisabled()

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
    expect(view.container.querySelectorAll('polygon')).toHaveLength(4)

    if (firstCorner !== null) {
      fireEvent.pointerDown(firstCorner, {button: 0})
      fireEvent.click(view.getByRole('button', {name: '정점 삭제'}))
    }

    expect(onDocumentChange).toHaveBeenCalledTimes(1)
    expect(view.container.querySelectorAll('circle')).toHaveLength(4)
    expect(view.container.querySelectorAll('polygon')).toHaveLength(2)
    expect(document().parts[0]?.mesh.vertices).toHaveLength(8)
    expect(document().parts[0]?.mesh.indices).toHaveLength(6)
    expect(document().parts[0]?.mesh.vertices).not.toBe(initialDocument.parts[0]?.mesh.vertices)
    expect(document().parts[0]?.mesh.indices).not.toBe(initialDocument.parts[0]?.mesh.indices)
  })
})
