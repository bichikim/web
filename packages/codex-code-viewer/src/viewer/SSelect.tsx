import {createEffect, createSignal, createUniqueId, For, Show} from 'solid-js'
import {SIcon} from './SIcon'
import {useSelect} from './use-select'

interface SSelectProps {
  readonly label: string
  readonly options: readonly string[]
  readonly value?: string
  readonly onChange?: (value: string) => void
}

export const SSelect = (props: SSelectProps) => {
  const id = `select-${createUniqueId()}`
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const selection = useSelect({
    onChange: (value) => props.onChange?.(value),
    options: () => props.options,
    value: () => props.value,
  })
  createEffect(() => {
    const panel = popup()
    const source = trigger()
    if (panel !== null && source !== null) {
      panel.showPopover({source})
    }
  })
  createEffect(() => {
    const index = selection.activeIndex()
    popup()?.querySelectorAll('[role="option"]')[index]?.scrollIntoView({block: 'nearest'})
  })
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (selection.keyboard(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const handleDismiss = (event: ToggleEvent & {currentTarget: HTMLDivElement}): void => {
    if (event.newState === 'closed' && event.currentTarget.isConnected) {
      selection.dismiss()
    }
  }
  return (
    <span class="inline-flex min-w-0" style={{'--select-anchor': `--${id}`}}>
      <button
        aria-activedescendant={
          selection.expanded() ? `${id}-option-${selection.activeIndex()}` : undefined
        }
        aria-controls={selection.expanded() ? id : undefined}
        aria-expanded={selection.expanded()}
        aria-haspopup="listbox"
        aria-label={props.label}
        class="ui-document-button min-w-26 max-w-64 justify-between gap-3 [anchor-name:var(--select-anchor)]"
        disabled={props.options.length === 0}
        onBlur={selection.dismiss}
        onClick={selection.toggle}
        onKeyDown={handleKeyboard}
        ref={setTrigger}
        role="combobox"
        type="button"
      >
        <span class="truncate">{selection.value() ?? '선택 항목 없음'}</span>
        <span class="flex text-muted">
          <SIcon name="chevronDown" />
        </span>
      </button>
      <Show when={selection.expanded()}>
        <div
          aria-label={props.label}
          class="fixed m-0 max-h-[min(16rem,calc(100dvh-6rem))] min-w-[max(10rem,anchor-size(width))]
            max-w-[min(20rem,calc(100dvw-2rem))] overflow-y-auto overscroll-contain rounded-control
            border border-divider bg-canvas p-1 font-sans text-sm text-foreground shadow-panel
            [position-anchor:var(--select-anchor)] [top:calc(anchor(bottom)+6px)] [left:anchor(left)]
            [right:auto] [bottom:auto] [position-try-fallbacks:flip-block,flip-inline]"
          id={id}
          onBeforeToggle={handleDismiss}
          popover="auto"
          ref={setPopup}
          role="listbox"
        >
          <For each={props.options}>
            {(option, index) => (
              <button
                aria-selected={option === selection.value()}
                class="ui-row flex w-full items-center justify-between gap-4 rounded-row px-3 py-2 text-left
                  data-[active=true]:bg-hover aria-selected:font-medium"
                data-active={index() === selection.activeIndex()}
                id={`${id}-option-${index()}`}
                onClick={() => selection.choose(option)}
                onPointerDown={(event) => event.preventDefault()}
                role="option"
                tabIndex={-1}
                title={option}
                type="button"
              >
                <span class="truncate">{option}</span>
                <span class="flex w-4 shrink-0 text-muted">
                  <Show when={option === selection.value()}>
                    <SIcon name="check" />
                  </Show>
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </span>
  )
}
