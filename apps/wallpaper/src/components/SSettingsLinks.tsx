import {text as uiText} from '../features/localization'
import {For, Show, useContext} from 'solid-js'
import type {SelectOption} from '../features/select'
import {SettingsNavigationContext} from '../features/settings-navigation'

interface SSettingsLinksProps {
  readonly label?: string
  readonly options: readonly SelectOption<string>[]
  readonly onChange?: (value: string) => void
  readonly onRemove?: (value: string) => void | Promise<void>
}

export const SSettingsLinks = (props: SSettingsLinksProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const select = (value: string) => {
    const change = props.onChange
    if (navigation === undefined) {
      return change?.(value)
    }
    const segment = {
      label: props.label ?? uiText('설정 목록'),
      onSelect: change,
      options: props.options,
      value,
    }
    return navigation.navigate([...navigation.path(), segment], () => change?.(value))
  }
  return (
    <nav aria-label={props.label ?? uiText('설정 목록')} class="grid min-w-0 gap-1">
      <For each={props.options}>
        {(option) => (
          <div class="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => select(option.value)}
              class="wallpaper-settings-link"
            >
              <span>{option.label}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                class="h-4 w-4 shrink-0 fill-none stroke-current text-stone-500 [stroke-width:1.5]"
              >
                <path d="m7.5 5 5 5-5 5" />
              </svg>
            </button>
            <Show when={props.onRemove !== undefined}>
              <button
                type="button"
                aria-label={uiText('{value0} 닫기', {value0: String(option.label)})}
                title={uiText('닫기')}
                onClick={() => props.onRemove?.(option.value)}
                class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border-0
              bg-transparent text-stone-500 hover:bg-stone-100 focus-visible:outline-solid
              focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="h-4 w-4 fill-none stroke-current [stroke-width:1.8]"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </Show>
          </div>
        )}
      </For>
    </nav>
  )
}
