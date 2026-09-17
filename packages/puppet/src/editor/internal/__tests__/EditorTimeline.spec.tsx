/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {setParameterKeyframe} from '../motion-keyframes'

describe('EditorTimeline', () => {
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
    expect(view.queryByRole('button', {name: 'blink 이벤트 실행'})).not.toBeInTheDocument()
    expect(view.queryByRole('button', {name: 'nod 이벤트 실행'})).not.toBeInTheDocument()

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => expect(screen.getByRole('option', {name: 'nod'})).toBeVisible())
    fireEvent.keyDown(screen.getByRole('option', {name: 'nod'}), {key: 'Enter'})

    expect(onMotionChange).toHaveBeenCalledWith('nod')
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
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 146}))
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 100}))
    fireEvent(window, new MouseEvent('pointerup', {bubbles: true, clientX: 100}))

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

    expect(view.getByText('Static mesh')).toBeVisible()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(view.getByRole('spinbutton', {name: 'Angle X 현재 값'})).toBeDisabled()
    expect(view.getByRole('button', {name: '정지'})).toBeDisabled()
    expect(view.getByRole('button', {name: '현재 위치에 키프레임'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.getByRole('slider', {name: '재생 위치'})).toHaveAttribute('aria-disabled', 'true')
  })
})
