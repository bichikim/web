import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'

import './FocusRoomIconButton.css'

const FEEDBACK_DURATION = 1_400

export interface FocusRoomIconButtonProps {
  readonly accessibleLabel: string
  readonly feedback: string
  readonly icon: string
  readonly onPress: (source: HTMLButtonElement) => void
}

export const FocusRoomIconButton = (props: FocusRoomIconButtonProps) => {
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined
  let previousFeedback = untrack(() => props.feedback)
  const [feedbackVisible, setFeedbackVisible] = createSignal(false)

  createEffect(() => {
    // oxlint-disable-next-line eslint/prefer-destructuring -- Solid props require reactive property access.
    const feedback = props.feedback

    if (feedback === previousFeedback) {
      return
    }

    previousFeedback = feedback
    if (feedbackTimer !== undefined) {
      clearTimeout(feedbackTimer)
    }
    setFeedbackVisible(true)
    feedbackTimer = setTimeout(() => setFeedbackVisible(false), FEEDBACK_DURATION)
  })

  onCleanup(() => {
    if (feedbackTimer !== undefined) {
      clearTimeout(feedbackTimer)
    }
  })

  return (
    <button
      aria-label={props.accessibleLabel}
      class="focus-room-backdrop focus-room-icon-button"
      data-feedback-visible={feedbackVisible() ? '' : undefined}
      onClick={(event) => props.onPress(event.currentTarget)}
      title={props.accessibleLabel}
      type="button"
    >
      <span aria-hidden="true" class={cx('focus-room-icon-button__icon size-5', props.icon)} />
      <span aria-hidden="true" class="focus-room-icon-button__feedback">
        {props.feedback}
      </span>
    </button>
  )
}
