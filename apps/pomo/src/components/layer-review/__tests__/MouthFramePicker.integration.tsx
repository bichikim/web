/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import type {PReviewMouthFrame} from 'src/features/focus-room-layer-review'
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
})
