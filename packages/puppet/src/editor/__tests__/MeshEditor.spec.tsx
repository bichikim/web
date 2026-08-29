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

  test('should snap a nearby click onto the current mesh boundary', () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onDocumentChange = vi.fn((nextDocument: PuppetDocument) => setDocument(nextDocument))
    const view = render(() => (
      <MeshEditor document={document()} onDocumentChange={onDocumentChange} />
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
      fireEvent.pointerDown(firstCorner)
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
