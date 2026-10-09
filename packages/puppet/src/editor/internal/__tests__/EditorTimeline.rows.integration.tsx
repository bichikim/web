/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {createTimelineTestDocument} from './timeline/fixtures'

const createSelectionPreservationDocument = (): PuppetDocument => {
  const document = createDemoDocument()

  return {
    ...document,
    motions: document.motions
      .filter((motion) => motion.id === 'idle-deform' || motion.id === 'blink')
      .map((motion) => ({
        ...motion,
        timelineParameterIds: ['angle-x'],
        tracks: motion.id === 'blink' ? motion.tracks : [],
      })),
  }
}

const createSingleMotionTimelineDocument = (): PuppetDocument => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: [
      {
        ...document.motions[0]!,
        timelineParameterIds: ['angle-x', 'angle-y'],
      },
    ],
  }
}
beforeEach(() => {
  vi.spyOn(console, 'warn')
})

afterEach(() => {
  try {
    expect(console.warn).not.toHaveBeenCalled()
  } finally {
    cleanup()
    vi.restoreAllMocks()
  }
})

describe('EditorTimeline', () => {
  test('should retain another motion selection when removing a timeline row from the full document', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

    const blink = view.getByRole('region', {name: 'blink 타임라인'})
    fireEvent.click(within(blink).getByRole('button', {name: 'Angle X 타임라인 행'}))
    const selectedRow = within(blink).getByRole('button', {name: 'Angle X 타임라인 행'})
    expect(selectedRow.closest('.timeline-row-label')).toHaveAttribute('data-selected')

    const idle = view.getByRole('region', {name: 'idle-deform 타임라인'})
    const removedRow = within(idle).getByRole('button', {name: 'Angle Y 타임라인 행'})
    fireEvent.keyDown(removedRow, {key: 'Delete'})
    fireEvent.keyDown(removedRow, {key: 'Delete'})

    expect(
      within(idle).queryByRole('button', {name: 'Angle Y 타임라인 행'}),
    ).not.toBeInTheDocument()
    expect(selectedRow.closest('.timeline-row-label')).toHaveAttribute('data-selected')
  })

  test('should delete a row from one motion in the all-motions view', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

    const idle = view.getByRole('region', {name: 'idle-deform 타임라인'})
    const row = within(idle).getByRole('button', {name: 'Angle Y 타임라인 행'})
    fireEvent.keyDown(row, {key: 'Delete'})
    expect(within(idle).getByLabelText('Angle Y 트랙')).toBeVisible()
    fireEvent.keyDown(row, {key: 'Delete'})

    expect(within(idle).queryByLabelText('Angle Y 트랙')).not.toBeInTheDocument()
    expect(document().motions[0]?.tracks).toEqual([])
    expect(document().motions[2]?.tracks).toEqual(createDemoDocument().motions[2]?.tracks)
  })

  test('should keep a timeline row after a cancelled swipe before deleting it', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createTimelineTestDocument())
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))
    const angleXTrack = view.getByLabelText('Angle X 트랙')
    const angleYTrack = view.getByLabelText('Angle Y 트랙')
    const row = view.getByRole('button', {name: 'Angle Y 타임라인 행'})

    expect(angleXTrack).toBeVisible()
    row.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 280}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointerup'))
    expect(angleYTrack).toBeVisible()

    row.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
    expect(view.getByText('놓아 삭제')).toBeVisible()
    globalThis.dispatchEvent(new MouseEvent('pointerup'))

    expect(view.queryByLabelText('Angle Y 트랙')).not.toBeInTheDocument()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(document().motions[0]?.tracks).toEqual([])
    expect(document().motions[2]?.tracks).toEqual(createDemoDocument().motions[2]?.tracks)
    expect(document().parameters).toEqual(createDemoDocument().parameters)
  })

  test('should retain another motion selection when removing a timeline row', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(
      createSelectionPreservationDocument(),
    )
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

    const blink = view.getByRole('region', {name: 'blink 타임라인'})
    fireEvent.click(within(blink).getByRole('button', {name: 'Angle X 타임라인 행'}))
    const selectedRow = within(blink).getByRole('button', {name: 'Angle X 타임라인 행'})
    expect(selectedRow.closest('.timeline-row-label')).toHaveAttribute('data-selected')

    const idle = view.getByRole('region', {name: 'idle-deform 타임라인'})
    const removedRow = within(idle).getByRole('button', {name: 'Angle X 타임라인 행'})
    fireEvent.keyDown(removedRow, {key: 'Delete'})
    fireEvent.keyDown(removedRow, {key: 'Delete'})

    expect(selectedRow.closest('.timeline-row-label')).toHaveAttribute('data-selected')
  })

  test('should reset the swipe state when the next parameter takes a removed row position', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(
      createSingleMotionTimelineDocument(),
    )
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))
    const row = view.getByRole('button', {name: 'Angle X 타임라인 행'})

    row.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 280}))
    globalThis.dispatchEvent(new MouseEvent('pointerup'))

    expect(view.queryByRole('button', {name: 'Angle X 타임라인 행'})).not.toBeInTheDocument()
    const nextRow = view.getByRole('button', {name: 'Angle Y 타임라인 행'})
    expect(nextRow.closest('.timeline-row-label-swipe')).toHaveAttribute(
      'style',
      expect.stringContaining('--parameter-swipe-offset: 0px'),
    )
  })

  test('should add timeline rows without creating keyframes', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))

    expect(view.queryByLabelText('Angle X 트랙')).not.toBeInTheDocument()
    expect(view.getByLabelText('Angle Y 트랙')).toBeVisible()

    fireEvent.keyDown(view.getByRole('button', {name: '타임라인 파라미터 추가'}), {key: 'Enter'})
    const parameter = await screen.findByRole('menuitem', {name: 'Angle X'})
    parameter.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(document().motions[0]?.timelineParameterIds).toEqual(['angle-x'])
    expect(document().motions[0]?.tracks).toEqual(createDemoDocument().motions[0]?.tracks)
  })
})
