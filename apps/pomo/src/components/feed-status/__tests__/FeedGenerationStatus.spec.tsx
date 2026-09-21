import {PreferenceProvider} from 'src/hooks/use-preference'
import * as m from '@paraglide/message'
import {createSignal} from 'solid-js'
/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useReadingStatusPreference} from 'src/features/feed-display-preferences'
import {FeedGenerationStatus} from '../FeedGenerationStatus'
beforeEach(() => localStorage.clear())
afterEach(cleanup)
it('should hide the progress card and restore its stop action when enabled again', () => {
  let preference: ReturnType<typeof useReadingStatusPreference>
  const onCancel = vi.fn()
  render(
    () => {
      preference = useReadingStatusPreference()
      return (
        <FeedGenerationStatus
          cancelDisabled={false}
          message="음성 생성 중"
          onCancel={onCancel}
          state="generating"
        />
      )
    },
    {wrapper: PreferenceProvider},
  )
  expect(screen.getByText('피드 읽는 중')).toBeInTheDocument()
  preference!.onVisibleChange(false)
  expect(screen.queryByRole('status')).toBeNull()
  expect(onCancel).not.toHaveBeenCalled()
  preference!.onVisibleChange(true)
  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  expect(onCancel).toHaveBeenCalledOnce()
})

it('should show progress and forward cancellation only while enabled', () => {
  const [disabled, setDisabled] = createSignal(false)
  const onCancel = vi.fn()
  render(
    () => (
      <FeedGenerationStatus
        cancelDisabled={disabled()}
        message="생성 진행 중"
        onCancel={onCancel}
        state="generating"
      />
    ),
    {wrapper: PreferenceProvider},
  )
  expect(screen.getByText('생성 진행 중')).toBeVisible()
  const button = screen.getByRole('button', {name: m.feed_stop()})
  fireEvent.click(button)
  expect(onCancel).toHaveBeenCalledOnce()
  setDisabled(true)
  expect(button).toBeDisabled()
})
