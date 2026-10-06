import {createSignal, onMount, Show} from 'solid-js'
import {SIcon} from './SIcon'

interface SNoticeProps {
  message: string
  onDismiss?: () => void
}

export const SNotice = (props: SNoticeProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  onMount(() => element()?.showPopover())
  const handleDismiss = (): void => {
    props.onDismiss?.()
  }
  const handleExpiry = (event: AnimationEvent): void => {
    if (event.target === event.currentTarget) {
      handleDismiss()
    }
  }
  return (
    <div
      aria-label="알림"
      class="fixed inset-x-4 bottom-14 top-auto mx-auto my-0 w-fit max-w-[calc(100%-2rem)]
        animate-toast-dismiss rounded-panel border border-divider bg-canvas p-3 font-sans text-foreground
        shadow-toast hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]
        motion-reduce:animate-toast-expire"
      onAnimationEnd={handleExpiry}
      popover="manual"
      ref={setElement}
    >
      <div class="flex items-center gap-3">
        <SIcon name="info" />
        <p aria-atomic="true" aria-live="polite" class="m-0 min-w-0 flex-1 text-sm" role="status">
          {props.message}
        </p>
        <Show when={props.onDismiss !== undefined}>
          <button
            aria-label="알림 닫기"
            class="ui-icon-button"
            onClick={handleDismiss}
            title="알림 닫기"
            type="button"
          >
            <SIcon name="close" />
          </button>
        </Show>
      </div>
    </div>
  )
}
