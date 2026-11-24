import {text as uiText} from '../features/localization'
import {createMemo, createSignal, For, Show} from 'solid-js'

interface SettingsListOption {
  /** Unique selection ID; option order is preserved. */
  readonly value: string
  /** Visible item name. */
  readonly label: string
  /** Optional trailing summary; omitted leaves the row name alone. */
  readonly description?: string
  /** Additional searchable names or IDs; omitted searches the label alone. */
  readonly keywords?: string
}
interface SSettingsListProps {
  /** Items available for editing. */
  readonly options: readonly SettingsListOption[]
  /** Accessible list and search name; defaults to 설정 항목. */
  readonly label?: string
  /** Keeps search available for short or empty lists when true. */
  readonly searchable?: boolean
  readonly emptyMessage?: string
  /** Selected item ID; omitted leaves every item unselected. */
  readonly value?: string
  /** Receives a chosen ID; omitted disables selection while retaining search. */
  readonly onChange?: (value: string) => void
}
const SEARCH_THRESHOLD = 4

/** Searches editable items without changing their saved settings. */
export const SSettingsList = (props: SSettingsListProps) => {
  const [query, setQuery] = createSignal('')
  const label = () => props.label ?? uiText('설정 항목')
  const filtered = createMemo(() => {
    const search = query().trim().toLocaleLowerCase()
    return props.options.filter((option) =>
      `${option.label} ${option.keywords ?? ''}`.toLocaleLowerCase().includes(search),
    )
  })
  const handleSearch = (event: InputEvent & {currentTarget: HTMLInputElement}) =>
    setQuery(event.currentTarget.value)
  return (
    <section aria-label={label()} class="grid min-w-0 gap-2">
      <Show
        when={(props.searchable ?? props.options.length > SEARCH_THRESHOLD) || query().length > 0}
      >
        <input
          type="search"
          aria-label={uiText('{value0} 검색', {value0: String(label())})}
          placeholder={uiText('이름 또는 파라미터 검색')}
          value={query()}
          onInput={handleSearch}
          class="wallpaper-field"
        />
      </Show>
      <div class="grid min-w-0 gap-1">
        <For each={filtered().map((option) => option.value)}>
          {(id) => {
            const option = () => props.options.find((item) => item.value === id)!
            const handleSelect = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
              event.currentTarget.focus({preventScroll: true})
              props.onChange?.(id)
            }
            return (
              <button
                type="button"
                aria-label={uiText('{value0} 편집', {value0: String(option().label)})}
                aria-description={option().description}
                aria-pressed={props.value === id}
                disabled={props.onChange === undefined}
                onClick={handleSelect}
                title={option().label}
                class="wallpaper-settings-link aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
              >
                <span class="min-w-0 flex-1 whitespace-normal leading-5 [overflow-wrap:anywhere]">
                  {option().label}
                </span>
                <Show when={option().description}>
                  <span class="max-w-1/2 truncate text-xs leading-5 text-stone-600">
                    {option().description}
                  </span>
                </Show>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  class="h-4 w-4 shrink-0 fill-none stroke-current text-stone-500 [stroke-width:1.5]"
                >
                  <path d="m7.5 5 5 5-5 5" />
                </svg>
              </button>
            )
          }}
        </For>
      </div>
      <Show when={filtered().length === 0}>
        <p role="status" class="m-0 py-2 text-xs text-stone-600">
          {query().trim().length === 0
            ? (props.emptyMessage ?? uiText('검색 결과가 없어요.'))
            : uiText('검색 결과가 없어요.')}
        </p>
      </Show>
    </section>
  )
}
