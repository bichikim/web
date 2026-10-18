import {useTranslations} from './locale/use-translations'
import {For, Show} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'

interface SDefinitionChoicesProps {
  locations: readonly CodeLocation[]
  onOpen?: (location: CodeLocation) => void
}
export const SDefinitionChoices = (props: SDefinitionChoicesProps) => {
  const t = useTranslations()
  return (
    <Show when={props.locations.length > 0}>
      <nav aria-label={t('정의 선택')} class="flex flex-wrap gap-2 border-b border-divider p-3">
        <For each={props.locations}>
          {(location) => (
            <button class="ui-button" type="button" onClick={() => props.onOpen?.(location)}>
              {location.path}:{location.line}
            </button>
          )}
        </For>
      </nav>
    </Show>
  )
}
