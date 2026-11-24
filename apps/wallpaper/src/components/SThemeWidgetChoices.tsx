import {For, Show} from 'solid-js'
import {text as uiText} from '../features/localization'

export interface ThemeWidgetChoice {
  readonly id: string
  readonly label: string
}

interface SThemeWidgetChoicesProps {
  readonly options: readonly ThemeWidgetChoice[]
  readonly selected: readonly string[]
  readonly onChange: (ids: readonly string[]) => void
}

export const SThemeWidgetChoices = (props: SThemeWidgetChoicesProps) => {
  const changeOne = (id: string, checked: boolean) =>
    props.onChange(
      checked ? [...props.selected, id] : props.selected.filter((selected) => selected !== id),
    )
  const changeAll = (checked: boolean) =>
    props.onChange(checked ? props.options.map((option) => option.id) : [])
  const allSelected = () => props.selected.length === props.options.length

  return (
    <Show when={props.options.length > 0}>
      <fieldset class="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend class="mb-1.5 p-0 text-xs font-medium text-stone-700">{uiText('위젯')}</legend>
        <Show when={props.options.length > 1}>
          <button
            class="justify-self-start border-0 bg-transparent p-0 text-xs text-violet-900 underline cursor-pointer"
            type="button"
            onClick={() => changeAll(!allSelected())}
          >
            {uiText(allSelected() ? '모든 위젯 선택 해제' : '모든 위젯 선택')}
          </button>
        </Show>
        <div class="grid max-h-32 gap-1 overflow-y-auto rounded-2 border border-solid border-stone-200 p-2">
          <For each={props.options}>
            {(option) => (
              <label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-stone-900">
                <input
                  type="checkbox"
                  class="accent-violet-800"
                  checked={props.selected.includes(option.id)}
                  onChange={(event) => changeOne(option.id, event.currentTarget.checked)}
                />
                <span class="min-w-0 break-words">{option.label}</span>
              </label>
            )}
          </For>
        </div>
      </fieldset>
    </Show>
  )
}
