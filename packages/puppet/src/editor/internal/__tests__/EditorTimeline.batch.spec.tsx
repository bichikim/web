/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderBatchSelection = async () => {
  const initialDocument = createDemoDocument()
  const [document, setDocument] = createSignal<PuppetDocument>({
    ...initialDocument,
    motions: initialDocument.motions
      .filter((motion) => ['idle-deform', 'blink'].includes(motion.id))
      .map((motion) => ({
        ...motion,
        timelineParameterIds: motion.tracks.flatMap((track) =>
          track.kind === 'parameter' ? [track.parameterId] : [],
        ),
      })),
  })
  const view = render(() => <EditorTimeline document={document()} onDocumentChange={setDocument} />)

  fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
  const allMotions = await screen.findByRole('option', {name: '모든 타임라인 보기'})
  fireEvent.keyDown(allMotions, {key: 'Enter'})

  const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
  const firstMarker = within(blinkGroup).getByRole('button', {name: 'Angle X 0.00초 키프레임'})
  const middleMarker = within(blinkGroup).getByRole('button', {name: 'Angle X 0.20초 키프레임'})
  const track = within(blinkGroup).getByLabelText('Angle X 트랙')
  fireEvent.click(firstMarker)
  fireEvent.click(middleMarker, {shiftKey: true})

  const keyframes = () =>
    document().motions.find((motion) => motion.id === 'blink')?.tracks[0]?.keyframes
  return {firstMarker, keyframes, middleMarker, track, view}
}

const moveBatchSelection = (batch: Awaited<ReturnType<typeof renderBatchSelection>>) => {
  vi.spyOn(batch.track, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({height: 20, width: 240}),
  )
  fireEvent(
    batch.middleMarker,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 120}),
  )
  fireEvent(batch.middleMarker, new MouseEvent('pointermove', {bubbles: true, clientX: 180}))
  fireEvent(batch.middleMarker, new MouseEvent('pointerup', {bubbles: true, clientX: 180}))
}

describe('EditorTimeline batch editing', () => {
  it('should move selected keyframes together in the all-motions view', async () => {
    const batch = await renderBatchSelection()
    expect(batch.firstMarker).toHaveAttribute('aria-pressed', 'true')
    expect(batch.middleMarker).toHaveAttribute('aria-pressed', 'true')
    expect(batch.view.getByRole('button', {name: '선택 키프레임 2개 삭제'})).toBeEnabled()

    moveBatchSelection(batch)

    expect(batch.keyframes()?.map((keyframe) => keyframe.time)).toEqual([7 / 24 - 0.2, 7 / 24, 0.4])
  })

  it('should update easing for moved selected keyframes', async () => {
    const batch = await renderBatchSelection()
    moveBatchSelection(batch)

    fireEvent.keyDown(batch.view.getByRole('button', {name: /^키프레임 이징/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'ease-out'}), {key: 'Enter'})

    expect(batch.keyframes()?.slice(0, 2)).toEqual([
      {easing: 'ease-out', time: 7 / 24 - 0.2, value: 0},
      {easing: 'ease-out', time: 7 / 24, value: 30},
    ])
  })

  it('should delete moved selected keyframes while preserving unselected keyframes', async () => {
    const batch = await renderBatchSelection()
    moveBatchSelection(batch)

    fireEvent.click(batch.view.getByRole('button', {name: '선택 키프레임 2개 삭제'}))

    expect(batch.keyframes()).toEqual([{time: 0.4, value: 0}])
  })
})
