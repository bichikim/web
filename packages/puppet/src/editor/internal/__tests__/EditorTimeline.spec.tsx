/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'

describe('EditorTimeline', () => {
  test('should render parameter rows and emit playback and keyframe selection', () => {
    const onPlaybackToggle = vi.fn()
    const onSeek = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={0.5}
        document={createDemoDocument()}
        isPlaying={true}
        onPlaybackToggle={onPlaybackToggle}
        onSeek={onSeek}
      />
    ))

    expect(view.getByText('12f / 48f · 0.50s')).toBeVisible()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(view.getByLabelText('Angle Y 트랙')).toBeVisible()
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(3)
    expect(view.container.querySelector<HTMLElement>('.timeline-row-playhead')?.style.left).toBe(
      '25%',
    )

    fireEvent.click(view.getByRole('button', {name: '정지'}))
    fireEvent.input(view.getByRole('slider', {name: '재생 위치'}), {target: {value: '1.25'}})
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))

    expect(onPlaybackToggle).toHaveBeenCalledOnce()
    expect(onSeek).toHaveBeenNthCalledWith(1, 1.25)
    expect(onSeek).toHaveBeenNthCalledWith(2, 1)
  })

  test('should add, edit, and delete parameter keyframes', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 현재 값'}), {
      target: {value: '15'},
    })

    expect(document().motions[0]?.tracks).toHaveLength(2)
    expect(document().motions[0]?.tracks[1]).toEqual({
      keyframes: [{time: 0.5, value: 15}],
      parameterId: 'angle-x',
    })
    expect(view.getAllByLabelText('Angle X 트랙')).toHaveLength(1)
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(4)

    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    expect(view.getByLabelText('키프레임 이징')).toBeEnabled()

    fireEvent.change(view.getByLabelText('키프레임 이징'), {
      target: {value: 'ease-in-out'},
    })

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

  test('should retain a read-only timeline for a static document', () => {
    const document = {...createDemoDocument(), motions: []}
    const view = render(() => <EditorTimeline document={document} />)

    expect(view.getByText('Static mesh')).toBeVisible()
    expect(view.getByLabelText('Angle X 트랙')).toBeVisible()
    expect(view.getByRole('spinbutton', {name: 'Angle X 현재 값'})).toBeDisabled()
    expect(view.getByRole('button', {name: '정지'})).toBeDisabled()
    expect(view.getByRole('button', {name: '+ 현재 위치에 키프레임'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.getByRole('slider', {name: '재생 위치'})).toBeDisabled()
  })
})
