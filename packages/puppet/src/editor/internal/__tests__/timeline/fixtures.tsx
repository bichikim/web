import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../../player'
import {EditorTimeline} from '../../EditorTimeline'

export const createTimelineTestDocument = (): PuppetDocument => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: document.motions.map((motion) => ({
      ...motion,
      timelineParameterIds: ['angle-x', 'angle-y'],
    })),
  }
}

export const enterAllMotionView = async (view: ReturnType<typeof render>) => {
  fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/u}), {key: 'Enter'})
  await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
  fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})
}

export const createAllMotionTimeline = () => {
  const initialTime = 0.5
  const [currentTime, setCurrentTime] = createSignal(initialTime)
  const [document, setDocument] = createSignal<PuppetDocument>(createTimelineTestDocument())
  const [motionId, setMotionId] = createSignal('idle-deform')
  const onMotionSeek = vi.fn((nextMotionId: string, time: number) => {
    setMotionId(nextMotionId)
    setCurrentTime(time)
  })
  const view = render(() => (
    <EditorTimeline
      currentTime={currentTime()}
      document={document()}
      motionId={motionId()}
      onDocumentChange={setDocument}
      onMotionSeek={onMotionSeek}
    />
  ))

  return {currentTime, document, motionId, onMotionSeek, view}
}

export const expectNoUnexpectedTimelineWarnings = () => {
  // Solid 2 logs explicit untracked reads in the editor and its UI primitives during these flows.
  const unexpected = vi
    .mocked(console.warn)
    .mock.calls.filter(
      ([message]) => typeof message !== 'string' || !message.startsWith('[STRICT_READ_UNTRACKED]'),
    )
  expect(unexpected).toEqual([])
}
