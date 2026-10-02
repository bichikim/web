/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {PGenerationStatus} from '../PGenerationStatus'

it('should show a concrete status without progress when no value is provided', () => {
  const result = render(() => (
    <PGenerationStatus
      kind="voice"
      message="대사를 입력한 뒤 음성 만들기를 눌러 주세요."
      progressLabel="음성 모델 준비 진행률"
    />
  ))

  expect(screen.getByRole('status').textContent).toBe('대사를 입력한 뒤 음성 만들기를 눌러 주세요.')
  expect(result.container.querySelector('[role="status"]')).toHaveClass(
    'bg-primary-soft',
    'text-foreground',
  )
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByRole('button', {name: '취소'})).toBeNull()
})

it('should expose and invoke an optional cancellation action', () => {
  const onCancel = vi.fn()
  render(() => (
    <PGenerationStatus
      kind="voice"
      message="음성 모델 파일을 내려받고 있어요."
      onCancel={onCancel}
      progress={42}
      progressLabel="음성 모델 준비 진행률"
    />
  ))

  const cancelButton = screen.getByRole('button', {name: '취소'})
  fireEvent.click(cancelButton)

  expect(onCancel).toHaveBeenCalledOnce()
})

it('should hide progress when its value is explicitly null', () => {
  render(() => (
    <PGenerationStatus
      kind="voice"
      message="준비 전"
      progress={null}
      progressLabel="음성 모델 준비 진행률"
    />
  ))

  expect(screen.queryByRole('progressbar')).toBeNull()
})

it('should expose zero percent progress with the requested semantic label', () => {
  render(() => (
    <PGenerationStatus
      kind="draft"
      message="대사 초안을 작성하고 있어요."
      progress={0}
      progressLabel="대사 생성 진행률"
    />
  ))

  expect(screen.getByRole('status').textContent).toContain('0%')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('0')
})

it('should keep finite and nonfinite progress presentation within its display range', () => {
  const [progress, setProgress] = createSignal<number | null | undefined>(150)
  const statusMessage = '대사 초안을 작성하고 있어요.'
  render(() => (
    <PGenerationStatus
      kind="draft"
      message={statusMessage}
      progress={progress()}
      progressLabel="대사 생성 진행률"
    />
  ))

  const status = screen.getByRole('status')
  const progressbar = screen.getByRole('progressbar', {name: '대사 생성 진행률'})
  expect(status.textContent).toContain('100%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('100')

  setProgress(-25)
  expect(status.textContent).toContain('0%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('0')

  setProgress(Number.NaN)
  expect(status.textContent).toContain('0%')
  expect(status.textContent).not.toContain('NaN%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('0')

  setProgress(Number.POSITIVE_INFINITY)
  expect(status.textContent).toContain('0%')
  expect(status.textContent).not.toContain('Infinity%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('0')

  setProgress(undefined)
  expect(status.textContent).toBe(statusMessage)
  expect(screen.queryByRole('progressbar')).toBeNull()
})

it('should snapshot a volatile progress accessor once', () => {
  let progressReads = 0
  const props = {
    kind: 'draft' as const,
    message: '대사 초안을 작성하고 있어요.',
    get progress() {
      progressReads += 1
      return progressReads === 1 ? 20 : undefined
    },
    progressLabel: '대사 생성 진행률',
  }

  render(() => PGenerationStatus(props))

  expect(progressReads).toBe(1)
  expect(screen.getByRole('status').textContent).toContain('20%')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('20')
})
