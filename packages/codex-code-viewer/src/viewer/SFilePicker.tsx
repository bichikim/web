import {createEffect, createSignal, createUniqueId, type JSX, on, Show} from 'solid-js'
import type {NavigationOptions} from './types'
import type {CodeLocation} from '../shared/contracts'
import {SFileResults} from './SFileResults'
import {SIcon} from './SIcon'
import {useFilePicker} from './use-file-picker'

interface SFilePickerProps {
  onOpen: (location: CodeLocation, options?: NavigationOptions) => void
  onFind?: (query: string) => void
  files?: string[]
  searchable?: boolean
  finding?: boolean
  busy?: boolean
  focusRequest?: number
  children?: JSX.Element
  actions?: JSX.Element
}

export const SFilePicker = (props: SFilePickerProps) => {
  const anchor = `--file-picker-${createUniqueId()}`
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const [pointerFocus, setPointerFocus] = createSignal(false)
  const picker = useFilePicker({
    busy: () => props.busy === true,
    files: () => props.files ?? [],
    finding: () => props.finding === true,
    onFind: (query) => props.onFind?.(query),
    onOpen: (location, options) => props.onOpen(location, options),
    searchable: () => props.searchable === true && props.onFind !== undefined,
  })
  createEffect(() => {
    const panel = popup()
    const source = input()
    if (panel !== null && source !== null) {
      panel.showPopover({source})
    }
  })
  createEffect(
    on(
      () => props.focusRequest ?? 0,
      () => {
        const field = input()
        field?.focus()
        field?.select()
        picker.show()
      },
      {defer: true},
    ),
  )
  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault()
    picker.submit()
  }
  const handleFocus = (): void => {
    if (!pointerFocus()) {
      picker.show()
    }
  }
  const handleClick = (): void => {
    setPointerFocus(false)
    picker.show()
  }
  const handleInput = (event: InputEvent & {currentTarget: HTMLInputElement}): void => {
    if (!event.isComposing) {
      picker.change(event.currentTarget.value)
    }
  }
  const handleComposition = (event: CompositionEvent & {currentTarget: HTMLInputElement}): void => {
    picker.change(event.currentTarget.value)
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        picker.move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        picker.move(-1)
        break
      case 'Escape':
        if (picker.expanded()) {
          event.preventDefault()
          event.stopPropagation()
          picker.dismiss()
        }
        break
    }
  }
  const handleBlur = (event: FocusEvent & {currentTarget: HTMLElement}): void => {
    const target = event.relatedTarget
    if (!(target instanceof Node) || !event.currentTarget.contains(target)) {
      setPointerFocus(false)
      picker.dismiss()
    }
  }
  return (
    <section class="shrink-0" onFocusOut={handleBlur} style={{'--file-picker-anchor': anchor}}>
      <form
        class="flex items-center gap-2 px-4 pt-3 pb-2 [--icon-size:16px] [--toolbar-control-height:33px]"
        onSubmit={handleSubmit}
      >
        {props.children}
        <div
          class="ui-field h-[var(--toolbar-control-height)] min-w-0 flex-1 rounded-pill px-4
            text-muted shadow-toolbar [anchor-name:var(--file-picker-anchor)]"
        >
          <SIcon name="search" />
          <input
            aria-activedescendant={
              picker.activePath() === null ? undefined : `file-result-${picker.activeIndex()}`
            }
            aria-autocomplete="list"
            aria-controls={picker.expanded() ? 'file-results' : undefined}
            aria-expanded={picker.expanded()}
            aria-label="파일 경로 또는 검색어"
            class="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            onCompositionEnd={handleComposition}
            onClick={handleClick}
            onFocus={handleFocus}
            onInput={handleInput}
            onKeyDown={handleKeyboard}
            onPointerCancel={() => setPointerFocus(false)}
            onPointerDown={() => setPointerFocus(true)}
            placeholder={props.searchable ? '파일 경로 또는 검색어…' : '파일의 절대 경로 입력…'}
            ref={setInput}
            role="combobox"
            value={picker.query()}
          />
        </div>
        <button
          class="ui-primary h-[var(--toolbar-control-height)] py-0 shadow-toolbar"
          disabled={!picker.canSubmit()}
          type="submit"
        >
          {picker.input().kind === 'path' ? '파일 열기' : '검색'}
        </button>
        {props.actions}
      </form>
      <Show when={picker.expanded()}>
        <div
          class="fixed m-0 rounded-panel border border-divider bg-canvas p-0 font-sans text-foreground shadow-panel
            [position-anchor:var(--file-picker-anchor)] [top:calc(anchor(bottom)+6px)]
            [left:anchor(left)] [right:auto] [bottom:auto] [width:anchor-size(width)]"
          onBeforeToggle={(event) => {
            if (event.newState === 'closed' && event.currentTarget.isConnected) {
              picker.dismiss()
            }
          }}
          popover="auto"
          ref={setPopup}
        >
          <SFileResults
            activeIndex={picker.activeIndex()}
            files={props.files ?? []}
            onChoose={picker.choose}
            pending={props.finding}
          />
        </div>
      </Show>
    </section>
  )
}
