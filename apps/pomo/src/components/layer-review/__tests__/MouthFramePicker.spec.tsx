/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import type {PReviewMouthFrame} from '../../../features/focus-room-layer-review/scene-renderer'
import {describe, expect, it, vi} from 'vitest'
import {MouthFramePicker} from '../MouthFramePicker'

describe('MouthFramePicker', () => {
  it('should list visemes and every transition stage with its review position', async () => {
    render(() => (
      <MouthFramePicker
        mouthFrame={null}
        mouthPositionComparison={false}
        onChange={vi.fn()}
        onPositionComparisonChange={vi.fn()}
      />
    ))

    const trigger = screen.getByRole('button', {name: /^개별 입 이미지/})

    expect(trigger).toHaveTextContent('전환 애니메이션으로 확인')
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    expect(await screen.findByRole('option', {name: '기본 미소 · 무음'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'closed → open · 중간 1'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'closed → open · 중간 2'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'closed → open · 중간 3'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'open → round · 중간 1'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'open → round · 중간 2'})).toBeInTheDocument()
    expect(screen.getByRole('option', {name: 'open → round · 중간 3'})).toBeInTheDocument()
  })

  it('should select a frame, clear it, and update position comparison', async () => {
    const onChange = vi.fn()
    const onPositionComparisonChange = vi.fn()
    const [mouthFrame, setMouthFrame] = createSignal<PReviewMouthFrame | null>(null)
    const [mouthPositionComparison, setMouthPositionComparison] = createSignal(false)

    render(() => (
      <MouthFramePicker
        mouthFrame={mouthFrame()}
        mouthPositionComparison={mouthPositionComparison()}
        onChange={(value) => {
          onChange(value)
          setMouthFrame(value)
        }}
        onPositionComparisonChange={(enabled) => {
          onPositionComparisonChange(enabled)
          setMouthPositionComparison(enabled)
        }}
      />
    ))

    const trigger = screen.getByRole('button', {name: /^개별 입 이미지/})
    const toggle = screen.getByRole('checkbox', {name: /^입 위치 비교/})

    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    fireEvent.click(await screen.findByRole('option', {name: 'open → round · 중간 2'}))
    expect(onChange).toHaveBeenCalledWith('open-round-middle')
    expect(trigger).toHaveTextContent('open → round · 중간 2')

    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    fireEvent.click(await screen.findByRole('option', {name: '전환 애니메이션으로 확인'}))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(trigger).toHaveTextContent('전환 애니메이션으로 확인')

    fireEvent.click(toggle)
    expect(onPositionComparisonChange).toHaveBeenCalledWith(true)
    expect(toggle).toBeChecked()
  })
})
