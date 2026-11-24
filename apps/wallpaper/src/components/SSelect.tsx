import {text as uiText} from '../features/localization'
import {createEffect, createMemo, createSignal, createUniqueId, For, on, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {type SelectOption, useSelect} from '../features/select'
import {SChevron} from './SChevron'
import {SSelectOption} from './SSelectOption'

interface SSelectProps<Value extends string> {
  readonly appearance?: 'field' | 'breadcrumb' | 'breadcrumb-arrow'
  readonly label: string
  readonly options: readonly SelectOption<Value>[]
  readonly value?: Value
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly onChange?: (value: Value) => void | Promise<void>
  /** Called when pointer or keyboard interaction opens the choices; omission performs no extra work. */
  readonly onOpen?: () => void
}

export const SSelect = <Value extends string>(props: SSelectProps<Value>) => {
  const id = `wallpaper-select-${createUniqueId()}`
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  let pointerExpanded: boolean | undefined
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
      uiText('선택해 주세요'),
  )
  createEffect(on(selection.expanded, (opened) => opened && props.onOpen?.()))
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
  const handleOpen = (event: MouseEvent) => {
    event.preventDefault()
    // WebKit can blur the invoker between pointerdown and click, dismissing the panel first.
    const wasExpanded =
      event.detail > 0 ? (pointerExpanded ?? selection.expanded()) : selection.expanded()
    pointerExpanded = undefined
    if (!disabled()) {
      trigger()?.focus()
      if (wasExpanded) {
        selection.dismiss()
      } else {
        selection.toggle()
      }
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
        popoverTarget={id}
        role="combobox"
        aria-label={props.label}
        aria-description={props.appearance === 'breadcrumb-arrow' ? label() : undefined}
        aria-expanded={selection.expanded()}
        aria-controls={selection.expanded() ? id : undefined}
        aria-activedescendant={
          selection.expanded() ? `${id}-${selection.activeIndex()}` : undefined
        }
        aria-haspopup="listbox"
        aria-disabled={disabled()}
        classList={{
          'wallpaper-breadcrumb-arrow': props.appearance === 'breadcrumb-arrow',
          'wallpaper-breadcrumb-select': props.appearance === 'breadcrumb',
          'wallpaper-select': props.appearance === undefined || props.appearance === 'field',
        }}
        style={{'--wallpaper-anchor': `--${id}`}}
        ref={setTrigger}
        onPointerDown={() => {
          pointerExpanded = selection.expanded()
        }}
        onPointerCancel={() => {
          pointerExpanded = undefined
        }}
        onClick={handleOpen}
        onKeyDown={handleKeyboard}
        onBlur={selection.dismiss}
      >
        <Show when={props.appearance !== 'breadcrumb-arrow'}>
          <span class="min-w-0 flex-1 truncate">{label()}</span>
        </Show>
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
