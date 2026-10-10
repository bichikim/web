/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {
  createDemoDocument,
  parseDocument,
  type PuppetDocument,
  serializeDocument,
} from '../../player'
import {PuppetEditor} from '../PuppetEditor'
import {createPlayerFixture} from './fixtures/player'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
const player = createPlayerFixture()

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  localStorage.clear()
  mocks.createPlayer.mockResolvedValue(player)
})

describe('PuppetEditor', () => {
  test('should edit mesh topology only from the modeling workspace and include it in history', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    const svg = view.container.querySelector<SVGSVGElement>('svg[aria-label="메시 정점 편집 영역"]')

    expect(svg).not.toBeNull()

    if (svg === null) {
      throw new Error('메시 정점 편집 영역을 찾지 못했습니다.')
    }

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

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(12)
    })
    expect(parseDocument(serializeDocument(onDocumentChange.mock.calls.at(-1)![0]!)).ok).toBe(true)

    const addedVertex = view.container.querySelectorAll('[data-part-id="mesh-preview"] circle')[5]
    expect(addedVertex).toBeDefined()
    if (addedVertex !== undefined) {
      fireEvent.pointerDown(addedVertex, {button: 0})
    }
    fireEvent.keyDown(view.getByLabelText('메시 정점 편집 영역'), {key: 'Backspace'})

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(10)
    })

    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(12)
    })

    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(10)
    })

    fireEvent.click(view.getByRole('button', {name: '애니메이션'}))

    const centerVertex = view.container.querySelectorAll('[data-part-id="mesh-preview"] circle')[4]
    expect(centerVertex).toBeDefined()
    if (centerVertex !== undefined) {
      fireEvent.pointerDown(centerVertex, {button: 0})
    }
  })

  test('should undo and redo document edits from the toolbar', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    const undoButton = screen.getByRole('button', {name: '실행 취소'})
    const redoButton = screen.getByRole('button', {name: '다시 실행'})

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    await waitFor(() => expect(undoButton).toBeEnabled())
    expect(undoButton).toHaveAccessibleDescription('1단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z')

    fireEvent.click(undoButton)
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(2)
    })
    expect(redoButton).toBeEnabled()

    fireEvent.click(redoButton)
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
    })
  })

  test('should group a scrubbed number field into one history entry', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    const opacityField = view.getByRole('spinbutton', {name: '파트 불투명도'})
    const undoButton = screen.getByRole('button', {name: '실행 취소'})
    vi.spyOn(opacityField, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({width: 100, x: 0}),
    )

    fireEvent(opacityField, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 95}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 90}))
    fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true, clientX: 90}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(
        document?.parameterBindings?.[0]?.keyforms
          .flatMap((keyform) => keyform.parts)
          .find((part) => part.properties?.opacity !== undefined)?.properties?.opacity,
      ).toBeCloseTo(0.9)
    })
    expect(undoButton).toHaveAccessibleDescription('1단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z')

    fireEvent.click(undoButton)

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(
        document?.parameterBindings?.[0]?.keyforms
          .flatMap((keyform) => keyform.parts)
          .some((part) => part.properties?.opacity !== undefined),
      ).toBe(false)
    })
  })

  test('should handle document history keyboard shortcuts outside editable controls', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z'})
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(2)
    })

    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'y'})
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
    })

    const nameInput = view.getByRole('spinbutton', {name: 'Parameter 3 값'})
    fireEvent.keyDown(nameInput, {ctrlKey: true, key: 'z'})
    expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
  })
})
