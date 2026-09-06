/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {FeedGenerationStatus} from '../FeedGenerationStatus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show progress and forward cancellation only while enabled', () => {
  const [disabled, setDisabled] = createSignal(false)
  const onCancel = vi.fn()
  render(() => (
    <FeedGenerationStatus
      cancelDisabled={disabled()}
      message="생성 진행 중"
      onCancel={onCancel}
      state="generating"
    />
  ))
  expect(screen.getByText('생성 진행 중')).toBeVisible()
  const button = screen.getByRole('button', {name: m.feed_stop()})
  fireEvent.click(button)
  expect(onCancel).toHaveBeenCalledOnce()
  setDisabled(true)
  expect(button).toBeDisabled()
})
