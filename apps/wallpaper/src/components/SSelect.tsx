import {createEffect, createMemo, createSignal, createUniqueId, For, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {type SelectOption, useSelect} from '../features/select'
import {SChevron} from './SChevron'
import {SSelectOption} from './SSelectOption'

interface SSelectProps<Value extends string> {
  readonly label: string
  readonly options: readonly SelectOption<Value>[]
  readonly value?: Value
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly onChange?: (value: Value) => void | Promise<void>
}

export const SSelect = <Value extends string>(props: SSelectProps<Value>) => {
  const id = `wallpaper-select-${createUniqueId()}`
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const disabled = createMemo(() => props.disabled === true || props.options.length === 0)
  const selection = useSelect({
    disabled,
    onChange: (value) => props.onChange?.(value),
    options: () => props.options,
    value: () => props.value,
  })
  const label = createMemo(
    () =>
      props.options.find((option) => option.value === selection.value())?.label ??
      props.placeholder ??
      '선택해 주세요',
  )
  createEffect(() => {
    const panel = popup()
    const source = trigger()
    if (panel !== null && source !== null) {
      panel.showPopover({source})
    }
  })
  createEffect(() => {
    const index = selection.activeIndex()
    popup()?.querySelectorAll('[role="option"]')[index]?.scrollIntoView?.({block: 'nearest'})
  })
  const handleKeyboard = (event: KeyboardEvent) => {
    if (selection.keyboard(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const handleOpen = () => {
    if (!disabled()) {
      trigger()?.focus()
      selection.toggle()
    }
  }
  const handleDismiss = (event: ToggleEvent & {currentTarget: HTMLDivElement}) => {
    if (event.newState === 'closed' && event.currentTarget.isConnected) {
      selection.dismiss()
    }
  }
  return (
    <>
      <button
        type="button"
        role="combobox"
        aria-label={props.label}
        aria-expanded={selection.expanded()}
        aria-controls={selection.expanded() ? id : undefined}
        aria-activedescendant={
          selection.expanded() ? `${id}-${selection.activeIndex()}` : undefined
        }
        aria-haspopup="listbox"
        aria-disabled={disabled()}
        class="wallpaper-select"
        style={{'--wallpaper-anchor': `--${id}`}}
        ref={setTrigger}
        onClick={handleOpen}
        onKeyDown={handleKeyboard}
        onBlur={selection.dismiss}
      >
        <span class="min-w-0 flex-1 truncate">{label()}</span>
        <SChevron up={selection.expanded()} />
      </button>
      <Show when={selection.expanded()}>
        <Portal mount={trigger()?.closest('dialog') ?? undefined}>
          <div
            id={id}
            role="listbox"
            aria-label={props.label}
            popover="auto"
            ref={setPopup}
            class="wallpaper-menu"
            style={{'--wallpaper-anchor': `--${id}`}}
            onBeforeToggle={handleDismiss}
          >
            <For each={props.options}>
              {(option, index) => (
                <SSelectOption
                  id={`${id}-${index()}`}
                  label={option.label}
                  selected={option.value === selection.value()}
                  active={index() === selection.activeIndex()}
                  onSelect={() => selection.choose(option.value)}
                />
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  )
}
