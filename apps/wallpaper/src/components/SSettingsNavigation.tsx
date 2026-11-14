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
  const selected = () => props.value ?? local()
  const select = (page: SettingsPage) => {
    setLocal(page)
    props.onChange?.(page)
  }
  return (
    <div class="flex h-dvh min-h-0 flex-col overflow-hidden min-[520px]:flex-row">
      <header
        class="box-border shrink-0 border-0 border-b border-solid border-stone-200 bg-stone-100/70
        px-3 py-3 min-[520px]:w-24 min-[520px]:border-b-0 min-[520px]:border-r min-[520px]:py-5"
      >
        <nav aria-label="설정 화면" class="grid grid-cols-4 gap-1 min-[520px]:grid-cols-1">
          <For each={PAGES}>
            {(page) => (
              <button
                type="button"
                aria-current={selected() === page.value ? 'page' : undefined}
                aria-controls={`${id}-panel-${page.value}`}
                class="min-h-10 cursor-pointer appearance-none rounded-lg border-0 bg-transparent px-3
                text-[13px] text-stone-700 [font-family:inherit] min-[520px]:text-left
                aria-[current=page]:bg-blue-100 aria-[current=page]:text-blue-800
                aria-[current=page]:font-semibold aria-[current=page]:hover:bg-blue-100
                hover:bg-stone-200/70 focus-visible:outline-solid
                focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
                onClick={() => select(page.value)}
              >
                {page.label}
              </button>
            )}
          </For>
        </nav>
      </header>
      <For each={PAGES}>
        {(page) => (
          <section
            id={`${id}-panel-${page.value}`}
            aria-label={`${page.label} 설정`}
            hidden={selected() !== page.value}
            tabindex={0}
            class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white focus-visible:outline-solid
            focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
          >
            <Show when={selected() === page.value}>
              <div class="box-border mx-auto grid min-w-0 max-w-140 gap-5 px-4 py-5 sm:px-6">
                <h2 class="m-0 text-xl font-semibold text-stone-900">{page.label}</h2>
                {props.children?.(page.value)}
              </div>
            </Show>
          </section>
        )}
      </For>
    </div>
  )
}
