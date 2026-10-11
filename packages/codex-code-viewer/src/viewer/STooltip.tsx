import {cx} from 'class-variance-authority'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
} from 'solid-js'

interface STooltipProps {
  readonly content?: string
  readonly placement?: 'top' | 'bottom' | 'left' | 'right'
  readonly class?: string
  readonly children?: (description: string) => JSX.Element
}

export const STooltip = (props: STooltipProps) => {
  const id = `tooltip-${createUniqueId()}`
  const [hovered, setHovered] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [dismissed, setDismissed] = createSignal(false)
  const [popup, setPopup] = createSignal<HTMLSpanElement | null>(null)
  const visible = createMemo(
    () => !dismissed() && (hovered() || focused()) && Boolean(props.content),
  )
  const dismiss = (): void => {
    setDismissed(true)
  }
  const handleEnter = (event: PointerEvent & {currentTarget: HTMLSpanElement}): void => {
    if (
      event.pointerType !== 'touch' &&
      !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
    ) {
      setDismissed(false)
      setHovered(true)
    }
  }
  const handleLeave = (event: PointerEvent & {currentTarget: HTMLSpanElement}): void => {
    if (
      !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
    ) {
      setHovered(false)
    }
  }
  const handleFocus = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) {
      setDismissed(false)
      setFocused(true)
    }
  }
  const handleBlur = (event: FocusEvent & {currentTarget: HTMLSpanElement}): void => {
    if (
      !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
    ) {
      setFocused(false)
    }
  }
  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
  }
  createEffect(() => {
    const panel = popup()
    if (!visible() || panel === null || !panel.isConnected) {
      return
    }
    panel.showPopover()
    const document = panel.ownerDocument
    // Hover can open a tooltip while keyboard focus remains outside its trigger.
    document.addEventListener('keydown', handleEscape, true)
    onCleanup(() => document.removeEventListener('keydown', handleEscape, true))
  })
  return (
    <span
      class={cx('inline-flex shrink-0 [anchor-name:var(--tooltip-anchor)]', props.class)}
      style={{'--tooltip-anchor': `--${id}`, '--tooltip-placement': props.placement ?? 'bottom'}}
      onPointerOver={handleEnter}
      onPointerOut={handleLeave}
      onFocusIn={handleFocus}
      onFocusOut={handleBlur}
      onPointerDown={dismiss}
      onClick={dismiss}
    >
      {props.children?.(id)}
      <Show when={visible()}>
        <span
          id={id}
          role="tooltip"
          popover="manual"
          ref={setPopup}
          class="fixed inset-auto m-0 w-max max-w-[min(20rem,calc(100dvw-16px))] overflow-visible
            border-0 bg-transparent p-2 [position-anchor:var(--tooltip-anchor)]
            [position-area:var(--tooltip-placement)] [position-try-fallbacks:flip-block,flip-inline]
            [position-visibility:anchors-visible]"
        >
          <span
            class="block select-none rounded-[12px] bg-[#111] px-3 py-1.5 font-sans text-xs font-medium leading-[18px]
              text-white shadow-[0_8px_24px_-4px_rgb(0_0_0_/_0.28)] [overflow-wrap:anywhere]"
          >
            {props.content}
          </span>
        </span>
      </Show>
    </span>
  )
}
