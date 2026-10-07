/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument as createBaseDocument,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {setParameterKeyframe} from '../motion-keyframes'

const createDemoDocument = (): PuppetDocument => {
  const document = createBaseDocument()
  return {
    ...document,
    motions: document.motions.map((motion) => ({
      ...motion,
      timelineParameterIds: ['angle-x', 'angle-y'],
    })),
  }
}

const createMotionSelectionDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  framesPerSecond: 1,
  motions: ['idle-deform', 'blink', 'nod'].map((id) => ({duration: 1, id, tracks: []})),
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const createKeyframeTimelineDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  framesPerSecond: 24,
  motions: [
    {
      duration: 2,
      id: 'idle-deform',
      timelineParameterIds: ['angle-x', 'angle-y'],
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 1, value: -30},
            {time: 2, value: 0},
          ],
          kind: 'parameter',
          parameterId: 'angle-y',
        },
      ],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'angle-x', maximum: 30, minimum: -30, name: 'Angle X'},
    {defaultValue: 0, id: 'angle-y', maximum: 30, minimum: -30, name: 'Angle Y'},
  ],
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

  return {currentTime, document, motionId, onMotionSeek, view}
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('EditorTimeline', () => {
  test('should expose motion selection without event controls', async () => {
    const onMotionChange = vi.fn()
    const view = render(() => (
      <EditorTimeline document={createMotionSelectionDocument()} onMotionChange={onMotionChange} />
    ))
    const motionSelector = view.getByRole('button', {name: /모션 선택/})

    expect(motionSelector).toBeVisible()
    expect(view.container.querySelector('.timeline-label')).toHaveTextContent(/^Timeline$/)
    expect(view.container.querySelector('.timeline-label strong')).not.toBeInTheDocument()
    expect(view.queryAllByRole('button', {name: /^(?:blink|nod) 이벤트 실행$/})).toHaveLength(0)

    fireEvent.keyDown(motionSelector, {key: 'Enter'})
    await waitFor(() => expect(screen.getByRole('option', {name: 'nod'})).toBeVisible())
    fireEvent.keyDown(screen.getByRole('option', {name: 'nod'}), {key: 'Enter'})

    expect(onMotionChange).toHaveBeenCalledWith('nod')
  })

  test('should add and duplicate motions from the toolbar', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createMotionSelectionDocument())
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

    expect(motionId()).toBe('motion')
    expect(document().motions.at(-1)).toEqual({duration: 1, id: 'motion', tracks: []})

    const manageMotions = view.getByRole('button', {name: '모션 관리'})
    fireEvent.keyDown(manageMotions, {key: 'Enter'})
    const duplicate = await screen.findByRole('menuitem', {name: '복제'})
    duplicate.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    expect(motionId()).toBe('motion-copy')
    expect(document().motions.at(-1)?.id).toBe('motion-copy')
  })

  test('should rename the active motion from the toolbar', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createMotionSelectionDocument())
    const [motionId, setMotionId] = createSignal('nod')
    const view = render(() => (
      <EditorTimeline
        document={document()}
        motionId={motionId()}
        onDocumentChange={setDocument}
        onMotionChange={setMotionId}
      />
    ))
    const manageMotions = view.getByRole('button', {name: '모션 관리'})

    fireEvent.keyDown(manageMotions, {key: 'Enter'})
    const rename = await screen.findByRole('menuitem', {name: '이름 변경'})
    rename.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))
    const nameInput = view.getByRole('textbox', {name: '모션 이름'})
    fireEvent.input(nameInput, {target: {value: 'wave'}})
    fireEvent.keyDown(nameInput, {key: 'Enter'})

    expect(motionId()).toBe('wave')
    expect(document().motions.at(-1)?.id).toBe('wave')
  })

  test('should delete the active motion and select the previous motion from the toolbar', async () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createMotionSelectionDocument())
    const [motionId, setMotionId] = createSignal('nod')
    const view = render(() => (
      <EditorTimeline
        document={document()}
        motionId={motionId()}
        onDocumentChange={setDocument}
        onMotionChange={setMotionId}
      />
    ))
    const manageMotions = view.getByRole('button', {name: '모션 관리'})
    fireEvent.keyDown(manageMotions, {key: 'Enter'})
    const remove = await screen.findByRole('menuitem', {name: '삭제'})
    remove.dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    expect(motionId()).toBe('blink')
    expect(document().motions.some((motion) => motion.id === 'nod')).toBe(false)
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

  test('should move a keyframe within its motion timeline', async () => {
    const {document, view} = createAllMotionTimeline()
    await enterAllMotionView(view)

    const blinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
    const blinkKeyframe = within(blinkGroup).getByRole('button', {
      name: 'Angle X 0.20초 키프레임',
    })
    const blinkTrack = within(blinkGroup).getByLabelText('Angle X 트랙')

    vi.spyOn(blinkTrack, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({height: 20, width: 240}),
    )
    fireEvent(
      blinkKeyframe,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 120}),
    )
    fireEvent(blinkKeyframe, new MouseEvent('pointermove', {bubbles: true, clientX: 181}))
    fireEvent(blinkKeyframe, new MouseEvent('pointerup', {bubbles: true, clientX: 181}))

    await waitFor(() => {
      const currentBlinkGroup = view.getByRole('region', {name: 'blink 타임라인'})
      expect(
        within(currentBlinkGroup).getByRole('button', {name: 'Angle X 0.29초 키프레임'}),
      ).toBeVisible()
    })
    expect(
      document()
        .motions.find((candidate) => candidate.id === 'blink')
        ?.tracks.find((track) => track.kind === 'parameter' && track.parameterId === 'angle-x')
        ?.keyframes[1]?.time,
    ).toBe(7 / 24)
  })

  test('should add a parameter keyframe at the current timeline position', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createKeyframeTimelineDocument())
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
  })

  test('should apply easing to a selected parameter keyframe', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createKeyframeTimelineDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    expect(view.getByRole('button', {name: /^키프레임 이징/})).toBeEnabled()

    fireEvent.keyDown(view.getByRole('button', {name: /^키프레임 이징/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'ease-in-out'}), {key: 'Enter'})

    expect(document().motions[0]?.tracks[0]?.keyframes[1]).toEqual({
      easing: 'ease-in-out',
      time: 1,
      value: -30,
    })
  })

  test('should delete a selected parameter keyframe', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createKeyframeTimelineDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    fireEvent.click(view.getByRole('button', {name: '선택 키프레임 삭제'}))

    expect(document().motions[0]?.tracks).toHaveLength(1)
    expect(document().motions[0]?.tracks[0]?.keyframes).toHaveLength(2)
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
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

  test('should show an empty read-only timeline when there is no motion', () => {
    const document = {...createDemoDocument(), motions: []}
    const view = render(() => <EditorTimeline document={document} />)

    expect(view.getByText('Timeline')).toBeVisible()
    expect(view.queryByText('Static mesh')).not.toBeInTheDocument()
    expect(view.getByText('타임라인에 파라미터가 없습니다.')).toBeVisible()
    expect(view.queryByLabelText('Angle X 트랙')).not.toBeInTheDocument()
    expect(view.getByRole('button', {name: '타임라인 파라미터 추가'})).toBeDisabled()
    expect(view.getByRole('button', {name: '정지'})).toBeDisabled()
    expect(view.getByRole('button', {name: '현재 위치에 키프레임'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.queryByRole('slider', {name: '재생 위치'})).not.toBeInTheDocument()
  })
})
