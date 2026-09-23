/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {MeshEditor} from '../MeshEditor'
import {setVertexKeyframe} from '../internal/motion-keyframes'
import {
  connectParameterNodes,
  setParameterKeyformDeformerControlPoints,
} from '../internal/parameter-keyforms'
import {createDeformer, getSceneNode} from '../internal/scene-graph'

describe('MeshEditor motion', () => {
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

  test('should render parameter animation through the part and its deformer', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getSceneNode(deformerDocument, 'deformer')!
    const connected = connectParameterNodes({
      bindingId: 'angle-xy',
      document: deformerDocument,
      nodeIds: [deformer.id],
    })!
    const controlPoints =
      deformer.kind === 'deformer'
        ? deformer.controlPoints.map((coordinate, index) =>
            index % 2 === 0 ? coordinate + 100 : coordinate,
          )
        : []
    const animated = setParameterKeyformDeformerControlPoints({
      bindingId: 'angle-xy',
      controlPoints,
      document: connected,
      nodeId: deformer.id,
      values: [0, -30],
    })!
    const [previewTime, setPreviewTime] = createSignal(0)
    const view = render(() => <MeshEditor document={animated} previewTime={previewTime()} />)

    expect(view.container.querySelectorAll('circle')[4]?.getAttribute('cx')).toBe('320')

    setPreviewTime(1)

    expect(view.container.querySelectorAll('circle')[4]?.getAttribute('cx')).toBe('420')
    expect(view.container.querySelectorAll('circle')[4]?.getAttribute('cy')).toBe('176')
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

  test.each([
    {existing: false, time: 0.5},
    {existing: true, time: 0},
    {existing: true, time: 0.5},
  ])(
    'should store a drag at $time with existing=$existing without changing rest vertices',
    ({existing, time}) => {
      const initialDocument = existing
        ? setVertexKeyframe({
            document: createDemoDocument(),
            motionId: 'idle-deform',
            partId: 'mesh-preview',
            point: {x: 320, y: 240},
            time,
            vertexIndex: 4,
          })!
        : createDemoDocument()
      const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
      const onVertexEditStart = vi.fn()
      const view = render(() => (
        <MeshEditor
          document={document()}
          onDocumentChange={setDocument}
          onVertexEditStart={onVertexEditStart}
          previewTime={time}
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
        fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 470, clientY: 320}))
        fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))
      }

      expect(view.container.querySelectorAll('circle')[4]).toHaveAttribute('cx', '310')
      expect(view.container.querySelectorAll('circle')[4]).toHaveAttribute('cy', '200')
      expect(document().parts[0]?.mesh.vertices[8]).toBe(320)
      expect(onVertexEditStart).toHaveBeenCalledOnce()
      expect(document().parts[0]?.mesh.vertices).toBe(initialDocument.parts[0]?.mesh.vertices)
      expect(document().parts[0]?.mesh.uvs).toBe(initialDocument.parts[0]?.mesh.uvs)
      const vertexTracks = document().motions[0]?.tracks.filter((track) => track.kind === 'vertex')
      expect(vertexTracks?.[0]?.keyframes[0]).toEqual({time, value: 310})
      expect(vertexTracks?.[1]?.keyframes).toEqual([{time, value: 200}])
    },
  )

  test('should disable topology editing in motion mode', () => {
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <MeshEditor
        document={createDemoDocument()}
        editMode="motion"
        onDocumentChange={onDocumentChange}
      />
    ))
    const firstVertex = view.container.querySelector('circle')

    if (firstVertex !== null) {
      fireEvent.pointerDown(firstVertex, {button: 0})
    }
    const canvas = view.getByLabelText('메시 정점 편집 영역')
    fireEvent.dblClick(canvas)
    fireEvent.keyDown(canvas, {key: 'Delete'})
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test.each([0, 0.5])(
    'should move an existing motion vertex at time %s while retaining its texture attachment',
    (time) => {
      const source = createDemoDocument()
      const initial: PuppetDocument = {
        ...source,
        motions: [
          {
            ...source.motions[0]!,
            tracks: [
              {
                axis: 'x',
                keyframes: [
                  {time: 0, value: 320},
                  {time: 2, value: 340},
                ],
                kind: 'vertex',
                partId: 'mesh-preview',
                vertexIndex: 4,
              },
            ],
          },
        ],
      }
      const [document, setDocument] = createSignal(initial)
      const view = render(() => (
        <MeshEditor
          document={document()}
          editMode="motion"
          onDocumentChange={setDocument}
          previewTime={time}
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
      fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 440, clientY: 320}))
      fireEvent.pointerUp(svg)

      expect(document().parts).toBe(initial.parts)
      expect(document().parts[0]!.mesh.uvs.slice(8)).toEqual([0.5, 0.5])
      expect(document().parameterBindings).toBe(initial.parameterBindings)
      expect(document().scene).toBe(initial.scene)
      const tracks = document().motions[0]!.tracks
      expect(tracks).toHaveLength(2)
      expect(tracks[0]!.keyframes).toContainEqual({time, value: 280})
      expect(tracks[0]!.keyframes).toContainEqual({time: 2, value: 340})
      expect(tracks[1]!.keyframes).toEqual([{time, value: 200}])
      expect(vertex).toHaveAttribute('cx', '280')
      expect(vertex).toHaveAttribute('cy', '200')
    },
  )
})
