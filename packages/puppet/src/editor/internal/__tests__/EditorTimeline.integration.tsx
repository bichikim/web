/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {setParameterKeyframe} from '../motion-keyframes'

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

const createTimelineTestDocument = (): PuppetDocument => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: document.motions.map((motion) => ({
      ...motion,
      timelineParameterIds: ['angle-x', 'angle-y'],
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

const createMotionManagementDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  framesPerSecond: 1,
  motions: ['idle-deform', 'blink', 'nod'].map((id) => ({duration: 1, id, tracks: []})),
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const enterAllMotionView = async (view: ReturnType<typeof render>) => {
  fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
  await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
  fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})
}

const createAllMotionTimeline = () => {
  const [currentTime, setCurrentTime] = createSignal(0.5)
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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

    fireEvent.click(view.getByText('Angle X', {exact: true}))
    fireEvent.click(view.getByRole('button', {name: '현재 위치에 키프레임'}))

    expect(document().motions[0]?.tracks[1]?.keyframes[0]?.time).toBe(16 / 30)
  })

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

  test('should render parameter rows and emit playback and keyframe selection', async () => {
    const [currentTime, setCurrentTime] = createSignal(0.5)
    const onPlaybackToggle = vi.fn()
    const onSeek = vi.fn((time: number) => setCurrentTime(time))
    const view = render(() => (
      <EditorTimeline
        currentTime={currentTime()}
        document={createTimelineTestDocument()}
        isPlaying={true}
        onPlaybackToggle={onPlaybackToggle}
        onSeek={onSeek}
      />
    ))

    expect(view.getByText('12f / 48f · 0.50s')).toBeVisible()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(view.getByLabelText('Angle Y 트랙')).toBeVisible()
    expect(view.getByRole('spinbutton', {name: 'Angle X 현재 값'})).toHaveAttribute('min', '-30')
    expect(view.getByRole('spinbutton', {name: 'Angle X 현재 값'})).toHaveAttribute('max', '30')
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(3)
    expect(view.container.querySelector<HTMLElement>('.timeline-row-playhead')?.style.left).toBe(
      '25%',
    )

    fireEvent.click(view.getByRole('button', {name: '정지'}))
    await waitFor(() =>
      expect(view.getByRole('slider', {name: '재생 위치'})).toHaveAttribute('aria-valuenow', '0.5'),
    )
    fireEvent.focus(view.getByRole('slider', {name: '재생 위치'}))
    fireEvent.keyDown(view.getByRole('slider', {name: '재생 위치'}), {key: 'End'})
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))

    await waitFor(() => expect(view.getByText('24f / 48f · 1.00s')).toBeVisible())
    expect(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    setCurrentTime(0.5)
    await waitFor(() =>
      expect(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    expect(onPlaybackToggle).toHaveBeenCalledOnce()
    expect(onSeek).toHaveBeenNthCalledWith(1, 2)
    expect(onSeek).toHaveBeenNthCalledWith(2, 1)
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

  test('should select keyframes independently across all motion timelines', async () => {
    const {onMotionSeek, view} = createAllMotionTimeline()
    await enterAllMotionView(view)

    const idleGroup = view.getByRole('region', {name: 'idle-deform 타임라인'})
    const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
    const blinkKeyframe = within(blinkGroup).getByRole('button', {
      name: 'Angle X 0.20초 키프레임',
    })
    const idleKeyframe = within(idleGroup).getByRole('button', {
      name: 'Angle Y 1.00초 키프레임',
    })
    const blinkTrack = within(blinkGroup).getByLabelText('Angle X 트랙')
    const idleTrack = within(idleGroup).getByLabelText('Angle Y 트랙')

    fireEvent.click(blinkKeyframe)
    await waitFor(() => expect(blinkKeyframe).toHaveAttribute('aria-pressed', 'true'))
    expect(blinkTrack).toHaveAttribute('data-selected', '')
    fireEvent.click(idleKeyframe)
    await waitFor(() => expect(idleKeyframe).toHaveAttribute('aria-pressed', 'true'))

    expect(blinkKeyframe).toHaveAttribute('aria-pressed', 'false')
    expect(blinkTrack).not.toHaveAttribute('data-selected')
    expect(idleTrack).toHaveAttribute('data-selected', '')
    expect(onMotionSeek).toHaveBeenNthCalledWith(1, 'blink', 0.2)
    expect(onMotionSeek).toHaveBeenNthCalledWith(2, 'idle-deform', 1)
  })

  test('should shift-select, move, ease, and delete keyframes together', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createTimelineTestDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))
    const firstMarker = view.getByRole('button', {name: 'Angle Y 0.00초 키프레임'})
    const middleMarker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
    const track = view.getByLabelText('Angle Y 트랙')

    fireEvent.click(firstMarker)
    fireEvent.click(middleMarker, {shiftKey: true})

    expect(firstMarker).toHaveAttribute('aria-pressed', 'true')
    expect(middleMarker).toHaveAttribute('aria-pressed', 'true')
    expect(view.getByRole('button', {name: '선택 키프레임 2개 삭제'})).toBeEnabled()

    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({height: 20, width: 240}),
    )
    fireEvent(middleMarker, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 120}))
    fireEvent(middleMarker, new MouseEvent('pointermove', {bubbles: true, clientX: 180}))
    fireEvent(middleMarker, new MouseEvent('pointerup', {bubbles: true, clientX: 180}))

    await waitFor(() =>
      expect(document().motions[0]?.tracks[0]?.keyframes.map((keyframe) => keyframe.time)).toEqual([
        0.5, 1.5, 2,
      ]),
    )
    expect(view.getByRole('button', {name: 'Angle Y 0.50초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(view.getByRole('button', {name: 'Angle Y 1.50초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.keyDown(view.getByRole('button', {name: /^키프레임 이징/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'ease-in-out'}), {key: 'Enter'})

    expect(document().motions[0]?.tracks[0]?.keyframes.slice(0, 2)).toEqual([
      {easing: 'ease-in-out', time: 0.5, value: 0},
      {easing: 'ease-in-out', time: 1.5, value: -30},
    ])

    fireEvent.click(view.getByRole('button', {name: '선택 키프레임 2개 삭제'}))
    expect(document().motions[0]?.tracks[0]?.keyframes).toEqual([{time: 2, value: 0}])
  })

  test('should only select keyframes from the active parameter when seeking', async () => {
    const document = setParameterKeyframe({
      document: createTimelineTestDocument(),
      motionId: 'idle-deform',
      parameterId: 'angle-x',
      time: 1,
      value: 0,
    })!
    const [currentTime, setCurrentTime] = createSignal(0)
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={currentTime()}
        document={document}
        onDocumentChange={onDocumentChange}
      />
    ))

    fireEvent.click(view.getByText('Angle X', {exact: true}))
    setCurrentTime(1)

    await waitFor(() => expect(view.getByText('24f / 48f · 1.00s')).toBeVisible())
    expect(view.getByRole('button', {name: 'Angle X 1.00초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    setCurrentTime(0.5)
    await waitFor(() =>
      expect(view.getByRole('button', {name: 'Angle X 1.00초 키프레임'})).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(onDocumentChange).not.toHaveBeenCalled()
  })
})
