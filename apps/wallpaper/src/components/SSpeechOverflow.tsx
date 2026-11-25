import {text as uiText} from '../features/localization'
import {createMemo, createSignal, createUniqueId, For, onCleanup} from 'solid-js'

interface SpeechOverflowItem {
  readonly id: string
  readonly title: string
  readonly status: string
}
interface SSpeechOverflowProps {
  /** Conversations omitted from the preview; omission shows an empty list. */
  readonly items?: readonly SpeechOverflowItem[]
  /** Selects a conversation after dismissing the list; omission only dismisses it. */
  readonly onSelect?: (id: string) => void | Promise<void>
  /** Reports popover visibility to hold hover previews; omission leaves preview behavior unchanged. */
  readonly onOpenChange?: (opened: boolean) => void
}

export const SSpeechOverflow = (props: SSpeechOverflowProps) => {
  const id = `speech-overflow-${createUniqueId()}`
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const filtered = createMemo(() => {
    const search = query().trim().toLocaleLowerCase()
    return (
      props.items?.filter((item) =>
        `${item.title} ${item.status}`.toLocaleLowerCase().includes(search),
      ) ?? []
    )
  })
  const handleToggle = (event: ToggleEvent) => {
    const opened = event.newState === 'open'
    if (opened) {
      setQuery('')
    }
    setExpanded(opened)
    props.onOpenChange?.(opened)
  }
  const choose = async (id: string) => {
    popup()?.hidePopover()
    await props.onSelect?.(id)
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      popup()?.hidePopover()
      trigger()?.focus({preventScroll: true})
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const options = Array.from(
        popup()?.querySelectorAll<HTMLButtonElement>('[role="group"] button') ?? [],
      )
      const current = event.target instanceof HTMLButtonElement ? options.indexOf(event.target) : -1
      const index =
        current === -1
          ? event.key === 'ArrowDown'
            ? 0
            : options.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      options[index]?.focus({preventScroll: true})
      options[index]?.scrollIntoView({block: 'nearest'})
      event.preventDefault()
      event.stopPropagation()
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const item = filtered()[0]
      if (item !== undefined) {
        choose(item.id)
      }
      event.preventDefault()
      event.stopPropagation()
    }
  }
  onCleanup(() => {
    if (expanded()) {
      props.onOpenChange?.(false)
    }
  })
  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-label={uiText('다른 대화 {value0}개', {value0: String(props.items?.length ?? 0)})}
        aria-expanded={expanded()}
        aria-haspopup="dialog"
        aria-controls={id}
        title={uiText('다른 대화 보기')}
        popovertarget={id}
        onClick={() => trigger()?.focus({preventScroll: true})}
        style={{'--wallpaper-anchor': `--${id}`}}
        class="wallpaper-speech-action bg-white/60 px-1.5 text-[11px] font-medium text-stone-600 tabular-nums
      [anchor-name:var(--wallpaper-anchor)]"
      >
        +{props.items?.length ?? 0}
      </button>
      <div
        ref={setPopup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={uiText('다른 대화')}
        onBeforeToggle={handleToggle}
        onKeyDown={handleKeyboard}
        style={{'--wallpaper-anchor': `--${id}`}}
        class="wallpaper-menu w-64 p-0 [&:popover-open]:flex [&:popover-open]:flex-col overflow-hidden"
      >
        <header class="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
          <span class="text-xs font-medium">{uiText('다른 대화')}</span>
          <button
            type="button"
            aria-label={uiText('목록 닫기')}
            popovertarget={id}
            popovertargetaction="hide"
            class="wallpaper-speech-action text-stone-600"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-4 w-4 fill-none stroke-current [stroke-width:1.75] [stroke-linecap:round]"
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="shrink-0 p-2">
          <input
            type="search"
            aria-label={uiText('대화 찾기')}
            placeholder={uiText('대화 찾기')}
            autofocus
            class="wallpaper-field"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div
          role="group"
          aria-label={uiText('대화 선택')}
          class="min-h-0 overflow-y-auto overscroll-contain p-1 pt-0"
        >
          <For
            each={filtered()}
            fallback={<p class="m-0 p-2 text-xs text-stone-500">{uiText('대화가 없어요.')}</p>}
          >
            {(item) => (
              <button
                type="button"
                onClick={() => choose(item.id)}
                class="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border-0
            bg-transparent px-2 py-1.5
            text-left text-xs text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                <span class="min-w-0 flex-1 truncate">{item.title}</span>
                <span class="shrink-0 text-[10px] text-stone-600">{item.status}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </>
  )
}
