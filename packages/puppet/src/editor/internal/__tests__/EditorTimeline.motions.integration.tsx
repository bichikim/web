/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {
  createAllMotionTimeline,
  createTimelineTestDocument,
  enterAllMotionView,
} from './timeline/fixtures'

const createMotionManagementDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  framesPerSecond: 1,
  motions: ['idle-deform', 'blink', 'nod'].map((id) => ({duration: 1, id, tracks: []})),
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})
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
  test('should add, duplicate, rename, and delete motions in one actual timeline session', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createMotionManagementDocument())
    const [motionId, setMotionId] = createSignal('idle-deform')
    const view = render(() => (
      <EditorTimeline
        document={document()}
        motionId={motionId()}
        onDocumentChange={setDocument}
        onMotionChange={setMotionId}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '모션 추가'}))

    await waitFor(() => expect(motionId()).toBe('motion'))
    expect(document().motions.at(-1)).toEqual({duration: 1, id: 'motion', tracks: []})

    fireEvent.keyDown(view.getByRole('button', {name: '모션 관리'}), {key: 'Enter'})
    const duplicate = await screen.findByRole('menuitem', {name: '복제'})
    duplicate.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    await waitFor(() => expect(motionId()).toBe('motion-copy'))
    expect(document().motions.at(-1)?.id).toBe('motion-copy')

    fireEvent.keyDown(view.getByRole('button', {name: '모션 관리'}), {key: 'Enter'})
    const rename = await screen.findByRole('menuitem', {name: '이름 변경'})
    rename.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))
    const nameInput = await view.findByRole('textbox', {name: '모션 이름'})
    fireEvent.input(nameInput, {target: {value: 'wave'}})
    fireEvent.keyDown(nameInput, {key: 'Enter'})

    await waitFor(() => expect(motionId()).toBe('wave'))
    expect(document().motions.at(-1)?.id).toBe('wave')

    fireEvent.keyDown(view.getByRole('button', {name: '모션 관리'}), {key: 'Enter'})
    const remove = await screen.findByRole('menuitem', {name: '삭제'})
    remove.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    await waitFor(() => expect(motionId()).toBe('motion'))
    expect(document().motions.some((motion) => motion.id === 'wave')).toBe(false)
  })

  test('should edit the active motion duration and document frame rate', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createTimelineTestDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))
    const duration = view.getByRole('spinbutton', {name: '모션 길이'})
    const framesPerSecond = view.getByRole('spinbutton', {name: '타임라인 FPS'})
    const motionName = view.getByRole('button', {name: 'idle-deform 모션 이름'})
    const motionHeader = motionName.closest('.timeline-motion-name-surface')

    expect(duration).toHaveValue(2)
    expect(motionHeader).toContainElement(duration)
    expect(duration).toHaveAttribute('min', '2')
    expect(framesPerSecond).toHaveValue(24)
    expect(framesPerSecond).toHaveAttribute('max', '240')
    expect(view.queryByText('Parameter', {exact: true})).not.toBeInTheDocument()
    expect(view.queryByText('길이', {exact: true})).not.toBeInTheDocument()

    fireEvent.input(duration, {target: {value: '3'}})
    fireEvent.input(framesPerSecond, {target: {value: '30'}})

    await waitFor(() => expect(document().motions[0]?.duration).toBe(3))
    expect(document().framesPerSecond).toBe(30)
    expect(view.getByText('16f / 90f · 0.52s')).toBeVisible()

    duration.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 120}))
    expect(view.queryByText('놓아 삭제')).not.toBeInTheDocument()

    const track = view.getByLabelText('Angle X 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({width: Number((duration as HTMLInputElement).value) * 100}),
    )
    fireEvent.dblClick(track, {clientX: 52})

    expect(document().motions[0]?.tracks[1]?.keyframes[0]?.time).toBe(16 / 30)
  })

  test('should rename and swipe-delete motion groups without leaving the all-motions view', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const [motionId, setMotionId] = createSignal('idle-deform')
    const view = render(() => (
      <EditorTimeline
        document={document()}
        motionId={motionId()}
        onDocumentChange={setDocument}
        onMotionChange={setMotionId}
      />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

    const idleGroup = view.getByRole('region', {name: 'idle-deform 타임라인'})
    fireEvent.dblClick(within(idleGroup).getByRole('button', {name: 'idle-deform 모션 이름'}))
    const nameInput = within(idleGroup).getByRole('textbox', {name: '모션 이름'})
    fireEvent.input(nameInput, {target: {value: 'idle'}})
    fireEvent.keyDown(nameInput, {key: 'Enter'})

    await waitFor(() => expect(document().motions[0]?.id).toBe('idle'))
    expect(view.getByRole('button', {name: /모션 선택 모든 타임라인 보기/})).toBeVisible()
    expect(view.getByRole('region', {name: 'idle 타임라인'})).toBeVisible()

    const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
    const blinkName = within(blinkGroup).getByRole('button', {name: 'blink 모션 이름'})
    expect(blinkName.closest('.timeline-motion-name-surface')).toContainElement(
      within(blinkGroup).getByRole('spinbutton', {name: 'blink 모션 길이'}),
    )
    blinkName.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 120}))

    expect(within(blinkGroup).getByText('놓아 삭제')).toBeVisible()
    expect(document().motions.some((motion) => motion.id === 'blink')).toBe(true)

    globalThis.dispatchEvent(new MouseEvent('pointerup'))

    await waitFor(() =>
      expect(document().motions.some((motion) => motion.id === 'blink')).toBe(false),
    )
    expect(view.getByRole('button', {name: /모션 선택 모든 타임라인 보기/})).toBeVisible()
    expect(view.queryByRole('region', {name: 'blink 타임라인'})).not.toBeInTheDocument()
  })

  test('should keep motion positions independent in the all-motions view', async () => {
    const {onMotionSeek, view} = createAllMotionTimeline()
    await enterAllMotionView(view)

    const idleGroup = view.getByRole('region', {name: 'idle-deform 타임라인'})
    const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
    const nodGroup = view.getByRole('region', {name: 'nod 타임라인'})
    const idleSeek = within(idleGroup).getByRole('slider', {name: 'idle-deform 재생 위치'})
    const blinkSeek = within(blinkGroup).getByRole('slider', {name: 'blink 재생 위치'})
    const nodSeek = within(nodGroup).getByRole('slider', {name: 'nod 재생 위치'})

    expect(view.getByRole('spinbutton', {name: '타임라인 FPS'})).toHaveValue(24)
    expect(within(idleGroup).getByRole('spinbutton', {name: 'idle-deform 모션 길이'})).toHaveValue(
      2,
    )
    expect(within(blinkGroup).getByRole('spinbutton', {name: 'blink 모션 길이'})).toHaveValue(0.4)
    expect(within(idleGroup).queryByText('Parameter', {exact: true})).not.toBeInTheDocument()
    expect(within(idleGroup).queryByText('길이', {exact: true})).not.toBeInTheDocument()
    expect(within(idleGroup).getByText(/12f \/ 48f/)).toBeVisible()

    expect(idleSeek).toHaveAttribute('aria-valuenow', '0.5')
    expect(blinkSeek).toHaveAttribute('aria-valuenow', '0')
    expect(nodSeek).toHaveAttribute('aria-valuenow', '0')

    fireEvent.focus(blinkSeek)
    fireEvent.keyDown(blinkSeek, {key: 'End'})
    await waitFor(() => expect(blinkSeek).toHaveAttribute('aria-valuenow', '0.4'))

    fireEvent.focus(nodSeek)
    fireEvent.keyDown(nodSeek, {key: 'End'})
    await waitFor(() => expect(nodSeek).toHaveAttribute('aria-valuenow', '0.8'))

    expect(idleSeek).toHaveAttribute('aria-valuenow', '0.5')
    expect(blinkSeek).toHaveAttribute('aria-valuenow', '0.4')
    expect(onMotionSeek).toHaveBeenNthCalledWith(1, 'blink', 0.4)
    expect(onMotionSeek).toHaveBeenNthCalledWith(2, 'nod', 0.8)
  })
})
