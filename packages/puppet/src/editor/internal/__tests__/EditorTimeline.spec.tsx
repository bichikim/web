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
  test('should edit the active motion duration and document frame rate', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
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

  test('should render parameter rows and emit playback and keyframe selection', async () => {
    const [currentTime, setCurrentTime] = createSignal(0.5)
    const onPlaybackToggle = vi.fn()
    const onSeek = vi.fn((time: number) => setCurrentTime(time))
    const view = render(() => (
      <EditorTimeline
        currentTime={currentTime()}
        document={createDemoDocument()}
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

  test('should expose motion selection without event controls', async () => {
    const onMotionChange = vi.fn()
    const view = render(() => (
      <EditorTimeline document={createDemoDocument()} onMotionChange={onMotionChange} />
    ))

    expect(view.getByRole('button', {name: /모션 선택/})).toBeVisible()
    expect(view.container.querySelector('.timeline-label')).toHaveTextContent(/^Timeline$/)
    expect(view.container.querySelector('.timeline-label strong')).not.toBeInTheDocument()
    expect(view.queryByRole('button', {name: 'blink 이벤트 실행'})).not.toBeInTheDocument()
    expect(view.queryByRole('button', {name: 'nod 이벤트 실행'})).not.toBeInTheDocument()

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => expect(screen.getByRole('option', {name: 'nod'})).toBeVisible())
    fireEvent.keyDown(screen.getByRole('option', {name: 'nod'}), {key: 'Enter'})

    expect(onMotionChange).toHaveBeenCalledWith('nod')
  })

  test('should add, duplicate, rename, and delete motions from the toolbar', async () => {
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

  test('should edit and keyboard-delete the active motion from its timeline name', async () => {
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
    const motionName = view.getByRole('button', {name: 'idle-deform 모션 이름'})

    fireEvent.dblClick(motionName)
    const nameInput = view.getByRole('textbox', {name: '모션 이름'})
    fireEvent.input(nameInput, {target: {value: 'idle'}})
    fireEvent.keyDown(nameInput, {key: 'Enter'})

    await waitFor(() => expect(motionId()).toBe('idle'))
    const renamedMotion = view.getByRole('button', {name: 'idle 모션 이름'})
    fireEvent.keyDown(renamedMotion, {key: 'Delete'})
    expect(document().motions.some((motion) => motion.id === 'idle')).toBe(true)
    fireEvent.keyDown(renamedMotion, {key: 'Delete'})

    await waitFor(() =>
      expect(document().motions.some((motion) => motion.id === 'idle')).toBe(false),
    )
    expect(motionId()).toBe('blink')
  })

  test('should group all motions with independently retained timeline positions', async () => {
    const [currentTime, setCurrentTime] = createSignal(0.5)
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
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

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

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
    expect(onMotionSeek).toHaveBeenNthCalledWith(3, 'blink', 0.2)
    expect(onMotionSeek).toHaveBeenNthCalledWith(4, 'idle-deform', 1)

    vi.spyOn(blinkTrack, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({height: 20, width: 240}),
    )
    fireEvent(
      blinkKeyframe,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 120}),
    )
    fireEvent(blinkKeyframe, new MouseEvent('pointermove', {bubbles: true, clientX: 181}))
    fireEvent(blinkKeyframe, new MouseEvent('pointerup', {bubbles: true, clientX: 181}))

    await waitFor(() =>
      expect(
        within(view.getByRole('region', {name: 'blink 타임라인'})).getByRole('button', {
          name: 'Angle X 0.29초 키프레임',
        }),
      ).toBeVisible(),
    )
    expect(
      document()
        .motions.find((candidate) => candidate.id === 'blink')
        ?.tracks.find((track) => track.kind === 'parameter' && track.parameterId === 'angle-x')
        ?.keyframes[1]?.time,
    ).toBe(7 / 24)
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

  test('should batch-edit keyframes in the all-motions view', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline document={document()} onDocumentChange={setDocument} />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})

    const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
    const firstMarker = within(blinkGroup).getByRole('button', {
      name: 'Angle X 0.00초 키프레임',
    })
    const middleMarker = within(blinkGroup).getByRole('button', {
      name: 'Angle X 0.20초 키프레임',
    })
    const track = within(blinkGroup).getByLabelText('Angle X 트랙')

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
      expect(
        document()
          .motions.find((motion) => motion.id === 'blink')
          ?.tracks[0]?.keyframes.map((keyframe) => keyframe.time),
      ).toEqual([7 / 24 - 0.2, 7 / 24, 0.4]),
    )

    fireEvent.keyDown(view.getByRole('button', {name: /^키프레임 이징/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'ease-out'}), {key: 'Enter'})
    expect(
      document()
        .motions.find((motion) => motion.id === 'blink')
        ?.tracks[0]?.keyframes.slice(0, 2),
    ).toEqual([
      {easing: 'ease-out', time: 7 / 24 - 0.2, value: 0},
      {easing: 'ease-out', time: 7 / 24, value: 30},
    ])

    fireEvent.click(view.getByRole('button', {name: '선택 키프레임 2개 삭제'}))
    expect(
      document().motions.find((motion) => motion.id === 'blink')?.tracks[0]?.keyframes,
    ).toEqual([{time: 0.4, value: 0}])
  })

  test('should add, ease, and delete parameter keyframes', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))

    fireEvent.click(view.getByText('Angle X', {exact: true}))
    fireEvent.click(view.getByRole('button', {name: '현재 위치에 키프레임'}))

    expect(document().motions[0]?.tracks).toHaveLength(2)
    expect(document().motions[0]?.tracks[1]).toEqual({
      keyframes: [{time: 0.5, value: 0}],
      kind: 'parameter',
      parameterId: 'angle-x',
    })
    expect(view.getAllByLabelText('Angle X 트랙')).toHaveLength(1)
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(4)

    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    expect(view.getByRole('button', {name: /^키프레임 이징/})).toBeEnabled()

    fireEvent.keyDown(view.getByRole('button', {name: /^키프레임 이징/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'ease-in-out'}), {key: 'Enter'})

    expect(document().motions[0]?.tracks[0]?.keyframes[1]).toEqual({
      easing: 'ease-in-out',
      time: 1,
      value: -30,
    })

    fireEvent.click(view.getByRole('button', {name: '선택 키프레임 삭제'}))

    expect(document().motions[0]?.tracks).toHaveLength(2)
    expect(document().motions[0]?.tracks[0]?.keyframes).toHaveLength(2)
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
  })

  test('should shift-select, move, ease, and delete keyframes together', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
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

  test('should preview a keyframe drag and commit its snapped time on release', async () => {
    const [currentTime, setCurrentTime] = createSignal(1)
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const onEditEnd = vi.fn()
    const onEditStart = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={currentTime()}
        document={document()}
        onDocumentChange={setDocument}
        onEditEnd={onEditEnd}
        onEditStart={onEditStart}
        onSeek={setCurrentTime}
      />
    ))
    const marker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
    const track = view.getByLabelText('Angle Y 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({height: 20, width: 240}),
    )

    fireEvent(marker, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 120}))
    fireEvent(marker, new MouseEvent('pointermove', {bubbles: true, clientX: 181}))

    expect(document().motions[0]?.tracks[0]?.keyframes[1]?.time).toBe(1)
    expect(marker).toHaveStyle({left: '75%'})

    fireEvent(marker, new MouseEvent('pointerup', {bubbles: true, clientX: 181}))

    await waitFor(() =>
      expect(view.getByRole('button', {name: 'Angle Y 1.50초 키프레임'})).toBeVisible(),
    )
    expect(document().motions[0]?.tracks[0]?.keyframes[1]?.time).toBe(1.5)
    expect(onEditStart).toHaveBeenCalledOnce()
    expect(onEditEnd).toHaveBeenCalledOnce()

    fireEvent.keyDown(view.getByRole('button', {name: 'Angle Y 1.50초 키프레임'}), {
      key: 'ArrowRight',
    })

    await waitFor(() =>
      expect(view.getByRole('button', {name: 'Angle Y 1.54초 키프레임'})).toBeVisible(),
    )
    expect(document().motions[0]?.tracks[0]?.keyframes[1]?.time).toBe(37 / 24)
    expect(onEditStart).toHaveBeenCalledTimes(2)
    expect(onEditEnd).toHaveBeenCalledTimes(2)
  })

  test('should edit parameter keyframes at both range endpoints', () => {
    const [negativeDocument, setNegativeDocument] =
      createSignal<PuppetDocument>(createDemoDocument())
    const negativeView = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={negativeDocument()}
        onDocumentChange={setNegativeDocument}
      />
    ))

    fireEvent.input(negativeView.getByRole('spinbutton', {name: 'Angle X 현재 값'}), {
      target: {value: '-30'},
    })

    expect(negativeDocument().motions[0]?.tracks[1]?.keyframes).toEqual([{time: 0.5, value: -30}])
    negativeView.unmount()

    const [positiveDocument, setPositiveDocument] =
      createSignal<PuppetDocument>(createDemoDocument())
    const positiveView = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={positiveDocument()}
        onDocumentChange={setPositiveDocument}
      />
    ))

    fireEvent.input(positiveView.getByRole('spinbutton', {name: 'Angle X 현재 값'}), {
      target: {value: '30'},
    })

    expect(positiveDocument().motions[0]?.tracks[1]?.keyframes).toEqual([{time: 0.5, value: 30}])
  })

  test('should keep timeline scrubbing active while updating a keyframe', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline currentTime={0.52} document={document()} onDocumentChange={setDocument} />
    ))
    const input = view.getByRole('spinbutton', {name: 'Angle X 현재 값'})
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 46, x: 100}))

    fireEvent(input, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 123}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 146}))
    fireEvent(globalThis.window, new MouseEvent('pointermove', {bubbles: true, clientX: 100}))
    fireEvent(globalThis.window, new MouseEvent('pointerup', {bubbles: true, clientX: 100}))

    expect(
      document().motions[0]?.tracks.find(
        (track) => track.kind === 'parameter' && track.parameterId === 'angle-x',
      )?.keyframes,
    ).toEqual([{time: 0.5, value: -30}])
  })

  test('should select a parameter without creating a keyframe when its name is clicked', () => {
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={0.5}
        document={createDemoDocument()}
        onDocumentChange={onDocumentChange}
        onSeek={() => undefined}
      />
    ))

    fireEvent.click(view.getByText('Angle X', {exact: true}))

    expect(view.getByLabelText('Angle X 트랙')).toHaveAttribute('data-selected', '')
    expect(view.getByLabelText('Angle Y 트랙')).not.toHaveAttribute('data-selected')
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(3)
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test('should only select keyframes from the active parameter when seeking', async () => {
    const document = setParameterKeyframe({
      document: createDemoDocument(),
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

  test('should clear keyframe selection when switching to a parameter without a keyframe', () => {
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={1}
        document={createDemoDocument()}
        onDocumentChange={onDocumentChange}
        onSeek={() => undefined}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    expect(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(view.getByText('Angle X', {exact: true}))

    expect(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.getByLabelText('Angle X 트랙')).toHaveAttribute('data-selected', '')
    expect(onDocumentChange).not.toHaveBeenCalled()
  })

  test.each([
    {parameterId: 'angle-x', parameterName: 'Angle X'},
    {parameterId: 'angle-y', parameterName: 'Angle Y'},
  ])(
    'should select $parameterName when seeking to its keyframe',
    async ({parameterId, parameterName}) => {
      const document = setParameterKeyframe({
        document: createDemoDocument(),
        motionId: 'idle-deform',
        parameterId,
        time: 1,
        value: 0,
      })!
      const [currentTime, setCurrentTime] = createSignal(0)
      const onSeek = vi.fn((time: number) => setCurrentTime(time))
      const view = render(() => (
        <EditorTimeline currentTime={currentTime()} document={document} onSeek={onSeek} />
      ))
      const track = view.getByLabelText(`${parameterName} 트랙`)

      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        bottom: 20,
        height: 20,
        left: 0,
        right: 200,
        toJSON: () => ({}),
        top: 0,
        width: 200,
        x: 0,
        y: 0,
      })
      fireEvent.click(track, {clientX: 100})

      await waitFor(() => expect(view.getByText('24f / 48f · 1.00s')).toBeVisible())
      expect(view.getByRole('button', {name: `${parameterName} 1.00초 키프레임`})).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(track).toHaveAttribute('data-selected', '')
      expect(onSeek).toHaveBeenCalledWith(1)
    },
  )

  test('should retain a read-only timeline for a static document', () => {
    const document = {...createDemoDocument(), motions: []}
    const view = render(() => <EditorTimeline document={document} />)

    expect(view.getByText('Timeline')).toBeVisible()
    expect(view.queryByText('Static mesh')).not.toBeInTheDocument()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(view.getByRole('spinbutton', {name: 'Angle X 현재 값'})).toBeDisabled()
    expect(view.getByRole('button', {name: '정지'})).toBeDisabled()
    expect(view.getByRole('button', {name: '현재 위치에 키프레임'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.getByRole('slider', {name: '재생 위치'})).toHaveAttribute('aria-disabled', 'true')
  })
})
