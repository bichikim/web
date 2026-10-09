/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import type {PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'
import {setParameterKeyframe} from '../motion-keyframes'
import {
  createAllMotionTimeline,
  createTimelineTestDocument,
  enterAllMotionView,
} from './timeline/fixtures'

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

  test('should add Angle X, ease and delete Angle Y, and keep both tracks on one mount', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createTimelineTestDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))

    const track = view.getByLabelText('Angle X 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 240}))
    fireEvent.dblClick(track, {clientX: 60})

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

    fireEvent.keyDown(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}), {
      key: 'Backspace',
    })

    expect(document().motions[0]?.tracks).toHaveLength(2)
    expect(document().motions[0]?.tracks[0]?.keyframes).toHaveLength(2)
    expect(view.getByRole('button', {name: /^키프레임 이징/})).toBeDisabled()
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

    fireEvent.keyDown(view.getByRole('button', {name: 'Angle Y 1.50초 키프레임'}), {
      key: 'Backspace',
    })
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
    expect(view.getByRole('button', {name: /^키프레임 이징/})).toBeDisabled()
    expect(onDocumentChange).not.toHaveBeenCalled()
  })
})
