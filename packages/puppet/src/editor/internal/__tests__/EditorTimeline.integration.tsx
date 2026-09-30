/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {setParameterKeyframe} from '../motion-keyframes'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('EditorTimeline', () => {
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
})
