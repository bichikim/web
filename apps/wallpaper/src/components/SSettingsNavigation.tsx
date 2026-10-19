import {createSignal, createUniqueId, For, type JSX, Show} from 'solid-js'

export type SettingsPage = 'background' | 'widget' | 'interaction' | 'general'
const PAGES = [
  {label: '배경', value: 'background'},
  {label: '위젯', value: 'widget'},
  {label: '조작', value: 'interaction'},
  {label: '일반', value: 'general'},
] as const
interface SSettingsNavigationProps {
  readonly value?: SettingsPage
  readonly onChange?: (page: SettingsPage) => void
  readonly children?: (page: SettingsPage) => JSX.Element
}
export const SSettingsNavigation = (props: SSettingsNavigationProps) => {
  const id = createUniqueId()
  const [local, setLocal] = createSignal<SettingsPage>('background')
  const [focused, setFocused] = createSignal<SettingsPage | null>(null)
  const [tabs, setTabs] = createSignal<HTMLDivElement | null>(null)
  const selected = () => props.value ?? local()
  const select = (page: SettingsPage) => {
    setLocal(page)
    props.onChange?.(page)
  }
  const handleKeyboard = (event: KeyboardEvent, index: number) => {
    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = (index + PAGES.length - 1) % PAGES.length
        break
      case 'ArrowRight':
        next = (index + 1) % PAGES.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = PAGES.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    tabs()?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
  const handleBlur = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node) || !tabs()?.contains(event.relatedTarget)) {
      setFocused(null)
    }
  }
  return (
    <div class="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header class="shrink-0 border-0 border-b border-solid border-stone-200 bg-stone-50 px-5 pt-3 sm:px-6">
        <div
          role="tablist"
          aria-label="설정 화면"
          ref={setTabs}
          onFocusOut={handleBlur}
          class="mx-auto grid max-w-128 grid-cols-4 gap-1"
        >
          <For each={PAGES}>
            {(page, index) => (
              <button
                type="button"
                role="tab"
                id={`${id}-tab-${page.value}`}
                aria-selected={selected() === page.value}
                aria-controls={`${id}-panel-${page.value}`}
                tabindex={(focused() ?? selected()) === page.value ? 0 : -1}
                class="min-h-10 cursor-pointer appearance-none border-0 border-b-2 border-solid border-transparent
                bg-transparent px-3 pb-3 text-[13px] text-stone-600 [font-family:inherit]
                aria-selected:border-blue-700 aria-selected:text-blue-700 aria-selected:font-semibold
                hover:text-stone-900 focus-visible:outline-solid focus-visible:outline-2
                focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
                onFocus={() => setFocused(page.value)}
                onClick={() => select(page.value)}
                onKeyDown={(event) => handleKeyboard(event, index())}
              >
                {page.label}
              </button>
            )}
          </For>
        </div>
      </header>
      <For each={PAGES}>
        {(page) => (
          <section
            role="tabpanel"
            id={`${id}-panel-${page.value}`}
            aria-labelledby={`${id}-tab-${page.value}`}
            hidden={selected() !== page.value}
            tabindex={0}
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-solid
            focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
          >
            <Show when={selected() === page.value}>
              <div class="box-border mx-auto grid max-w-140 gap-4 px-5 py-4 sm:px-6">
                {props.children?.(page.value)}
              </div>
            </Show>
          </section>
        )}
      </For>
    </div>
  )
}
