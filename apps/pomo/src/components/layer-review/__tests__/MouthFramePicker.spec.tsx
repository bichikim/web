/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import type {PReviewMouthFrame} from '../../../features/focus-room-layer-review/scene-renderer'
import {describe, expect, it, vi} from 'vitest'
import {MouthFramePicker} from '../MouthFramePicker'

describe('MouthFramePicker', () => {
  it('should list visemes and every transition stage with its review position', () => {
    render(() => (
      <MouthFramePicker
        mouthFrame={null}
        mouthPositionComparison={false}
        onChange={vi.fn()}
        onPositionComparisonChange={vi.fn()}
      />
    ))

    expect(screen.getByRole('combobox', {name: /^개별 입 이미지/})).toHaveValue('')
    expect(screen.getByRole('option', {name: '기본 미소 · 무음'})).toHaveValue('rest')
    expect(screen.getByRole('option', {name: 'closed → open · 중간 1'})).toHaveValue('release')
    expect(screen.getByRole('option', {name: 'closed → open · 중간 2'})).toHaveValue('small-open')
    expect(screen.getByRole('option', {name: 'closed → open · 중간 3'})).toHaveValue('half-open')
    expect(screen.getByRole('option', {name: 'open → round · 중간 1'})).toHaveValue(
      'open-round-early',
    )
    expect(screen.getByRole('option', {name: 'open → round · 중간 2'})).toHaveValue(
      'open-round-middle',
    )
    expect(screen.getByRole('option', {name: 'open → round · 중간 3'})).toHaveValue(
      'open-round-late',
    )
  })

  it('should select a frame, clear it, and update position comparison', () => {
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

    const select = screen.getByRole('combobox', {name: /^개별 입 이미지/})
    const toggle = screen.getByRole('checkbox', {name: /^입 위치 비교/})

    fireEvent.change(select, {target: {value: 'open-round-middle'}})
    expect(onChange).toHaveBeenCalledWith('open-round-middle')
    expect(select).toHaveValue('open-round-middle')

    fireEvent.change(select, {target: {value: ''}})
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(select).toHaveValue('')

    fireEvent.click(toggle)
    expect(onPositionComparisonChange).toHaveBeenCalledWith(true)
    expect(toggle).toBeChecked()
  })
})
