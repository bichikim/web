import {text as uiText} from '../features/localization'
import {createEffect, createSignal, createUniqueId, Show} from 'solid-js'
import type {WebsiteVisit} from '@winter-love/wallpaper/settings/library-model'
import {SChevron} from './SChevron'
import {useWebsiteAddress} from '../features/website-address'
import {SWebsiteHistory} from './SWebsiteHistory'

interface SWebsiteAddressProps {
  readonly value?: string
  readonly history?: readonly WebsiteVisit[]
  readonly disabled?: boolean
  readonly onChange?: (value: string) => void | Promise<void>
  readonly onRemove?: (url: string) => void | Promise<void>
}

export const SWebsiteAddress = (props: SWebsiteAddressProps) => {
  const id = `website-address-${createUniqueId()}`
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const history = () => props.history ?? []
  const field = useWebsiteAddress({
    available: () => history().length > 0,
    disabled: () => props.disabled === true,
    onChange: (value) => props.onChange?.(value),
    value: () => props.value,
  })
  const choose = (address: string) => {
    input()?.focus()
    return field.choose(address)
  }
  const remove = async (address: string) => {
    await props.onRemove?.(address)
    input()?.focus()
  }
  const handleToggle = () => {
    const opened = field.expanded()
    input()?.focus()
    if (opened) {
      field.dismiss()
    } else {
      field.show()
    }
  }
  const handleFocusOut = (event: FocusEvent & {currentTarget: HTMLDivElement}) => {
    if (
      !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
    ) {
      field.commit()
    }
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.isComposing || props.disabled) {
      return
    }
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        field.commit()
        return
      case 'Escape':
        event.preventDefault()
        field.cancel()
        return
      case 'ArrowDown':
        event.preventDefault()
        field.show()
        popup()?.querySelector<HTMLButtonElement>('li button')?.focus()
    }
  }
  const handlePopupKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      input()?.focus()
      field.cancel()
    }
  }
  const handleDismiss = (event: ToggleEvent & {currentTarget: HTMLDivElement}) => {
    if (event.newState === 'closed' && event.currentTarget.isConnected) {
      field.dismiss()
    }
  }
  createEffect(() => {
    const panel = popup()
    const source = input()
    if (panel !== null && source !== null) {
      panel.showPopover({source})
    }
  })
  return (
    <div class="grid min-w-0 gap-2" onFocusOut={handleFocusOut}>
      <label for={id} class="text-sm font-medium text-stone-700">
        {uiText('웹사이트 주소')}
      </label>
      <div
        class="wallpaper-field flex items-center p-0 [anchor-name:var(--wallpaper-anchor)]
        focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700"
        style={{'--wallpaper-anchor': `--${id}`}}
      >
        <input
          id={id}
          ref={setInput}
          type="url"
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={field.expanded()}
          aria-controls={field.expanded() ? `${id}-history` : undefined}
          aria-autocomplete="none"
          readOnly={props.disabled}
          aria-disabled={props.disabled ?? false}
          autocomplete="off"
          spellcheck={false}
          placeholder="https://"
          class="wallpaper-number-text min-h-8"
          value={field.text()}
          onInput={(event) => field.edit(event.currentTarget.value)}
          onFocus={field.show}
          onClick={field.show}
          onKeyDown={handleKeyboard}
        />
        <Show when={history().length > 0}>
          <button
            type="button"
            aria-label={uiText('방문 내역')}
            aria-haspopup="dialog"
            aria-expanded={field.expanded()}
            aria-controls={field.expanded() ? `${id}-history` : undefined}
            disabled={props.disabled}
            class="wallpaper-step min-h-8 w-8 shrink-0 rounded-r-md focus-visible:outline-solid
            focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            onClick={handleToggle}
            onMouseDown={(event) => event.preventDefault()}
          >
            <SChevron up={field.expanded()} />
          </button>
        </Show>
      </div>
      <Show when={field.expanded()}>
        <div
          id={`${id}-history`}
          role="dialog"
          aria-label={uiText('방문 내역')}
          popover="auto"
          ref={setPopup}
          class="wallpaper-menu [width:anchor-size(width)]"
          style={{'--wallpaper-anchor': `--${id}`}}
          onBeforeToggle={handleDismiss}
          onKeyDown={handlePopupKeyboard}
        >
          <p class="m-0 px-2 py-1 text-xs text-stone-600">{uiText('방문 내역')}</p>
          <SWebsiteHistory
            history={history()}
            onChoose={choose}
            onRemove={props.onRemove === undefined ? undefined : remove}
          />
        </div>
      </Show>
    </div>
  )
}
