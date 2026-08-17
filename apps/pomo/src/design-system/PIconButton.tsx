import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'

const FEEDBACK_DURATION = 1_400

// oxlint-disable eslint-js/max-len -- UnoCSS must extract the complete arbitrary-value utility.
const FEEDBACK_TRANSITION =
  'transition-[max-width_240ms_cubic-bezier(0.4,0,0.2,1),margin-left_240ms_cubic-bezier(0.4,0,0.2,1),opacity_140ms_ease]'
// oxlint-enable eslint-js/max-len

export type PIconButtonSize = 'medium' | 'small'

export interface PIconButtonProps {
  readonly accessibleLabel: string
  readonly class?: string
  readonly feedback: string
  readonly icon: string
  readonly onPress: (source: HTMLButtonElement) => void
  readonly size?: PIconButtonSize
}

export const PIconButton = (props: PIconButtonProps) => {
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
      class={cx(
        'pomo-icon-button pomo-backdrop pomo-interactive-glass pomo-strong-focus-ring ' +
          'inline-flex box-border items-center justify-center ' +
          'overflow-hidden rounded-[var(--pomo-radius-control)] bg-[var(--pomo-glass)] ' +
          'text-[var(--pomo-text)] shadow-[var(--pomo-shadow)] outline-none ' +
          'transition-[border-color_160ms_ease,background-color_160ms_ease,color_160ms_ease] ' +
          'motion-reduce:transition-none',
        (props.size ?? 'medium') === 'small'
          ? 'h-[var(--pomo-control-height-small)] min-w-[var(--pomo-control-height-small)] ' +
              'px-[var(--pomo-padding-sm)]'
          : 'h-[var(--pomo-control-height-medium)] min-w-[var(--pomo-control-height-medium)] ' +
              'px-[var(--pomo-padding-md)]',
        props.class,
      )}
      data-feedback-visible={feedbackVisible() ? '' : undefined}
      data-size={props.size ?? 'medium'}
      onClick={(event) => props.onPress(event.currentTarget)}
      title={props.accessibleLabel}
      type="button"
    >
      <span
        aria-hidden="true"
        class={cx(
          props.icon,
          'pomo-icon-button__icon flex-none text-[var(--pomo-brass)]',
          (props.size ?? 'medium') === 'small' ? 'size-4' : 'size-5',
        )}
        data-pomo-icon-button-icon=""
      />
      <span
        aria-hidden="true"
        class={cx(
          `max-w-0 overflow-hidden whitespace-nowrap text-[var(--pomo-text)] font-650 leading-4 ` +
            `opacity-0 ${FEEDBACK_TRANSITION} ` +
            `motion-reduce:transition-none`,
          (props.size ?? 'medium') === 'small' ? 'text-xs' : 'text-[0.8125rem]',
          feedbackVisible() && 'ml-2 max-w-32 opacity-100',
        )}
      >
        {props.feedback}
      </span>
    </button>
  )
}
