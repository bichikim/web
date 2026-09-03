/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PIconButton} from '../PIconButton'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should expose the medium icon button class contract', () => {
  const result = render(() => (
    <PIconButton
      accessibleLabel="시간대 낮"
      feedback="낮"
      icon="i-tabler-sun"
      onPress={() => undefined}
    />
  ))

  const button = result.getByRole('button', {name: '시간대 낮'})

  expect(button.classList.contains('pomo-icon-button')).toBe(true)
  expect(button.classList.contains('h-control-md')).toBe(true)
  expect(button.classList.contains('min-w-control-md')).toBe(true)
  expect(button.classList.contains('[padding-inline:0.5625rem]')).toBe(true)
  expect(button.querySelector('[data-pomo-icon-button-icon]')).toHaveClass('size-6')
  expect(button).not.toHaveAttribute('title')
})

it('should expose the small icon button class contract', () => {
  const result = render(() => (
    <PIconButton
      accessibleLabel="다음 단계로 이동"
      feedback="다음 단계"
      icon="i-tabler-player-track-next"
      onPress={() => undefined}
      size="small"
    />
  ))

  const button = result.getByRole('button', {name: '다음 단계로 이동'})

  expect(button.classList.contains('pomo-icon-button')).toBe(true)
  expect(button.classList.contains('h-control-sm')).toBe(true)
  expect(button.classList.contains('min-w-control-sm')).toBe(true)
  expect(button.classList.contains('[padding-inline:0.4375rem]')).toBe(true)
  expect(button.querySelector('[data-pomo-icon-button-icon]')).toHaveClass('size-4')
})

it('should reveal the updated feedback without retaining hidden-state classes', () => {
  const [feedback, setFeedback] = createSignal('낮')
  const result = render(() => (
    <PIconButton
      accessibleLabel={`시간대 ${feedback()}`}
      feedback={feedback()}
      icon="i-tabler-sun"
      onPress={() => setFeedback('밤')}
    />
  ))

  const button = result.getByRole('button', {name: '시간대 낮'})
  const feedbackLabel = button.lastElementChild

  expect(feedbackLabel).toBeInstanceOf(HTMLSpanElement)
  expect(feedbackLabel?.classList.contains('max-w-0')).toBe(true)
  expect(feedbackLabel?.classList.contains('opacity-0')).toBe(true)

  fireEvent.click(button)

  expect(result.getByRole('button', {name: '시간대 밤'})).toBe(button)
  expect(button.getAttribute('data-feedback-visible')).toBe('')
  expect(feedbackLabel?.textContent).toBe('밤')
  expect(feedbackLabel?.classList.contains('ml-2')).toBe(true)
  expect(feedbackLabel?.classList.contains('max-w-32')).toBe(true)
  expect(feedbackLabel?.classList.contains('opacity-100')).toBe(true)
  expect(feedbackLabel?.classList.contains('max-w-0')).toBe(false)
  expect(feedbackLabel?.classList.contains('opacity-0')).toBe(false)
})

it('should restart feedback timing and hide the latest message after the duration', () => {
  vi.useFakeTimers()
  const [feedback, setFeedback] = createSignal('낮')
  const result = render(() => (
    <PIconButton
      accessibleLabel="시간대"
      feedback={feedback()}
      icon="i-tabler-sun"
      onPress={() => undefined}
    />
  ))
  const button = result.getByRole('button', {name: '시간대'})

  setFeedback('밤')
  expect(vi.getTimerCount()).toBe(1)

  setFeedback('새벽')
  expect(vi.getTimerCount()).toBe(1)
  expect(button).toHaveAttribute('data-feedback-visible', '')
  expect(button).toHaveTextContent('새벽')

  vi.advanceTimersByTime(1_399)
  expect(button).toHaveAttribute('data-feedback-visible', '')

  vi.advanceTimersByTime(1)
  expect(button).not.toHaveAttribute('data-feedback-visible')
})
