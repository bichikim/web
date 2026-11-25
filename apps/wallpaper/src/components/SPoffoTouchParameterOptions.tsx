import {interfaceLanguage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'
import {For, Show} from 'solid-js'
import type {TouchParameter} from '../features/touch'

interface SPoffoTouchParameterOptionsProps {
  readonly parameters: readonly TouchParameter[]
  readonly emptyMessage?: string
  readonly disabled?: boolean
  readonly onSelect?: (id: string) => void | Promise<void>
}

export const SPoffoTouchParameterOptions = (props: SPoffoTouchParameterOptionsProps) => (
  <For
    each={props.parameters}
    fallback={
      <p class="m-0 p-2 text-xs text-stone-500">
        {props.emptyMessage ?? uiText('검색 결과가 없어요.')}
      </p>
    }
  >
    {(parameter) => {
      const label = () => parameterName(parameter, interfaceLanguage.language())
      const handleChoose = () => props.onSelect?.(parameter.id)
      return (
        <button
          type="button"
          onClick={handleChoose}
          disabled={props.disabled || props.onSelect === undefined}
          class="grid min-h-9 w-full cursor-pointer gap-0.5 rounded border-0 bg-transparent px-2 py-1.5
          text-left [font-family:inherit] hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2
          focus-visible:outline-blue-700 disabled:cursor-default disabled:opacity-50"
        >
          <span class="min-w-0 truncate">{label()}</span>
          <Show when={label() !== parameter.id}>
            <span class="min-w-0 truncate text-xs text-stone-500">{parameter.id}</span>
          </Show>
        </button>
      )
    }}
  </For>
)
