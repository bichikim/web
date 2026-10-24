/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'

import {PProgress} from '../PProgress'

afterEach(cleanup)

describe('PProgress', () => {
  it('should expose a labeled determinate Kobalte progressbar', () => {
    render(() => <PProgress label="모델 다운로드 진행률" value={42} />)

    expect(screen.getByRole('progressbar', {name: '모델 다운로드 진행률'})).toHaveAttribute(
      'aria-valuenow',
      '42',
    )
  })

  it('should omit the current value while progress is indeterminate', () => {
    render(() => <PProgress label="준비 진행률" />)

    expect(screen.getByRole('progressbar', {name: '준비 진행률'})).not.toHaveAttribute(
      'aria-valuenow',
    )
  })
  it('should display the percentage and update the fill with a reactive value', () => {
    const [value, setValue] = createSignal(25)
    render(() => <PProgress label="파일 보내는 중" presentation="bar" value={value()} />)
    const progress = screen.getByRole('progressbar', {name: '파일 보내는 중'})
    expect(progress).not.toHaveClass('sr-only')
    expect(screen.getByText('25%')).toBeVisible()
    expect(progress.querySelector('[style*="--kb-progress-fill-width"]')).toHaveStyle(
      '--kb-progress-fill-width: 25%',
    )
    setValue(75)
    expect(progress).toHaveAttribute('aria-valuenow', '75')
    expect(screen.getByText('75%')).toBeVisible()
    expect(progress.querySelector('[style*="--kb-progress-fill-width"]')).toHaveStyle(
      '--kb-progress-fill-width: 75%',
    )
  })

  it('should display an indeterminate track without inventing a percentage', () => {
    render(() => <PProgress label="파일 준비 중" presentation="bar" />)
    const progress = screen.getByRole('progressbar', {name: '파일 준비 중'})
    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(progress.querySelector('[data-indeterminate]')).toBeInTheDocument()
    expect(screen.queryByText(/%/u)).not.toBeInTheDocument()
  })
})
