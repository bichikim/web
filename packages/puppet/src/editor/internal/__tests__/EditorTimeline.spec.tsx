/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'

describe('EditorTimeline', () => {
  test('should render track rows and emit playback and keyframe selection', () => {
    const onPlaybackToggle = vi.fn()
    const onSeek = vi.fn()
    const onTargetSelect = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={0.5}
        document={createDemoDocument()}
        isPlaying={true}
        onPlaybackToggle={onPlaybackToggle}
        onSeek={onSeek}
        onTargetSelect={onTargetSelect}
      />
    ))

    expect(view.getByText('12f / 48f · 0.50s')).toBeVisible()
    expect(view.getByLabelText('mesh-preview 정점 5 트랙')).toBeVisible()
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(3)
    expect(view.container.querySelector<HTMLElement>('.timeline-row-playhead')?.style.left).toBe(
      '25%',
    )

    fireEvent.click(view.getByRole('button', {name: '정지'}))
    fireEvent.input(view.getByRole('slider', {name: '재생 위치'}), {target: {value: '1.25'}})
    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 5 1.00초 키프레임'}))

    expect(onPlaybackToggle).toHaveBeenCalledOnce()
    expect(onSeek).toHaveBeenNthCalledWith(1, 1.25)
    expect(onSeek).toHaveBeenNthCalledWith(2, 1)
    expect(onTargetSelect).toHaveBeenCalledWith('mesh-preview', 4)
  })

  test('should add a sampled vertex keyframe and edit its outgoing easing', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorTimeline
        activePartId="mesh-preview"
        activeVertexIndex={4}
        currentTime={0.52}
        document={document()}
        onDocumentChange={setDocument}
        onSeek={() => undefined}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '+ 현재 위치에 키프레임'}))

    expect(document().motions[0]?.tracks).toHaveLength(2)
    expect(document().motions[0]?.tracks[0]?.keyframes[1]).toEqual({time: 0.5, value: 208})
    expect(view.getAllByLabelText('mesh-preview 정점 5 트랙')).toHaveLength(1)
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(4)
    expect(view.getByLabelText('키프레임 이징')).toBeEnabled()

    fireEvent.change(view.getByLabelText('키프레임 이징'), {
      target: {value: 'ease-in-out'},
    })

    expect(document().motions[0]?.tracks[0]?.keyframes[1]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 208,
    })
    expect(document().motions[0]?.tracks[1]?.keyframes[0]).toEqual({
      easing: 'ease-in-out',
      time: 0.5,
      value: 320,
    })

    fireEvent.click(view.getByRole('button', {name: '선택 키프레임 삭제'}))

    expect(document().motions[0]?.tracks).toHaveLength(1)
    expect(document().motions[0]?.tracks[0]?.keyframes).toHaveLength(3)
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
  })

  test('should retain a read-only timeline for a static document', () => {
    const document = {...createDemoDocument(), motions: []}
    const view = render(() => <EditorTimeline document={document} />)

    expect(view.getByText('Static mesh')).toBeVisible()
    expect(view.getByText('애니메이션 트랙이 없습니다.')).toBeVisible()
    expect(view.getByRole('button', {name: '정지'})).toBeDisabled()
    expect(view.getByRole('button', {name: '+ 현재 위치에 키프레임'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키프레임 삭제'})).toBeDisabled()
    expect(view.getByRole('slider', {name: '재생 위치'})).toBeDisabled()
  })
})
