import {interfaceLanguage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'
import {createSignal, createUniqueId} from 'solid-js'
import {type TouchParameter, useParameterPicker} from '../features/touch'
import {SChevron} from './SChevron'
import {SPoffoTouchParameterOptions} from './SPoffoTouchParameterOptions'

interface SPoffoTouchParameterPickerProps {
  readonly label?: string
  readonly value?: string
  readonly placeholder?: string
  readonly closeOnSelect?: boolean
  readonly emptyMessage?: string
  readonly parameters: readonly TouchParameter[]
  readonly disabled?: boolean
  readonly onSelect?: (id: string) => void | Promise<void>
}

/** Finds unselected parameters by name or ID and keeps the list open for successive additions. */
export const SPoffoTouchParameterPicker = (props: SPoffoTouchParameterPickerProps) => {
  const id = `touch-parameters-${createUniqueId()}`
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const disabled = () => props.disabled || props.onSelect === undefined
  const label = () => props.label ?? uiText('터치 파라미터 추가')
  const selection = () => {
    const parameter = props.parameters.find((parameter) => parameter.id === props.value)
    return parameter === undefined
      ? props.value || props.placeholder || uiText('파라미터 추가')
      : parameterName(parameter, interfaceLanguage.language())
  }
  const picker = useParameterPicker({
    disabled,
    onSelect: (id) => props.onSelect?.(id),
    parameters: () => props.parameters,
  })
  const handleToggle = (event: ToggleEvent) =>
    event.newState === 'open' ? picker.open() : picker.close()
  const handleClose = () => {
    popup()?.hidePopover()
    trigger()?.focus({preventScroll: true})
  }
  const handleSelect = async (id: string) => {
    await picker.choose(id)
    if (props.closeOnSelect) {
      handleClose()
      return
    }
    const field = input()
    if (picker.expanded() && field?.isConnected) {
      field.focus({preventScroll: true})
    }
  }
  const handleInput = (event: InputEvent & {currentTarget: HTMLInputElement}) =>
    picker.search(event.currentTarget.value)
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.isComposing) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      handleClose()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const buttons = [
        ...(popup()?.querySelectorAll<HTMLButtonElement>('[role="group"] button:not(:disabled)') ??
          []),
      ]
      const current = event.target instanceof HTMLButtonElement ? buttons.indexOf(event.target) : -1
      const next =
        current === -1
          ? event.key === 'ArrowDown'
            ? 0
            : buttons.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus({preventScroll: true})
      buttons[next]?.scrollIntoView({block: 'nearest'})
      event.preventDefault()
      event.stopPropagation()
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const parameter = picker.filtered()[0]
      if (parameter !== undefined) {
        handleSelect(parameter.id)
      }
      event.preventDefault()
      event.stopPropagation()
    }
  }
  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-label={label()}
        title={selection()}
        aria-expanded={picker.expanded()}
        aria-haspopup="dialog"
        aria-controls={id}
        popovertarget={id}
        disabled={disabled()}
        onClick={() => trigger()?.focus({preventScroll: true})}
        class="wallpaper-select disabled:cursor-default disabled:opacity-50"
        style={{'--wallpaper-anchor': `--${id}`}}
      >
        <span class="min-w-0 flex-1 truncate">{selection()}</span>
        <SChevron up={picker.expanded()} />
      </button>
      <div
        ref={setPopup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label()}
        onBeforeToggle={handleToggle}
        onKeyDown={handleKeyboard}
        style={{'--wallpaper-anchor': `--${id}`}}
        class="wallpaper-menu p-0 [&:popover-open]:flex [&:popover-open]:flex-col overflow-hidden"
      >
        <div class="flex shrink-0 items-center gap-2 p-2">
          <input
            ref={setInput}
            type="search"
            autofocus
            aria-label={uiText('파라미터 검색')}
            placeholder={uiText('이름 또는 ID 검색')}
            class="wallpaper-field min-w-0 flex-1"
            value={picker.query()}
            onInput={handleInput}
          />
          <button
            type="button"
            aria-label={uiText('파라미터 목록 닫기')}
            onClick={handleClose}
            class="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent text-stone-600
              hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            ×
          </button>
        </div>
        <div
          role="group"
          aria-label={uiText('추가할 파라미터')}
          aria-busy={picker.pending()}
          class="min-h-0 overflow-y-auto overscroll-contain p-1 pt-0"
        >
          <SPoffoTouchParameterOptions
            parameters={picker.filtered()}
            disabled={disabled() || picker.pending()}
            onSelect={handleSelect}
            emptyMessage={
              props.parameters.length === 0
                ? (props.emptyMessage ?? uiText('추가할 파라미터가 없어요.'))
                : uiText('검색 결과가 없어요.')
            }
          />
        </div>
      </div>
    </>
  )
}
