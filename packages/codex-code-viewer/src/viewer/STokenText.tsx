import {For, Show} from 'solid-js'
import type {CodeToken} from '../shared/contracts'
import type {TextMatch} from './find-text'
import {splitSearchToken} from './split-search-token'

interface STokenTextProps {
  token: CodeToken
  matches?: readonly TextMatch[]
  activeMatch?: number
}

export const STokenText = (props: STokenTextProps) => (
  <For each={splitSearchToken(props.token, props.matches ?? [])}>
    {(fragment) => (
      <Show fallback={fragment.text} when={fragment.match !== null}>
        <mark
          class="rounded-[2px] bg-search text-inherit data-[active=true]:bg-accent
            data-[active=true]:text-canvas data-[active=true]:outline data-[active=true]:outline-1
            data-[active=true]:outline-accent"
          data-active={fragment.match === props.activeMatch}
          data-search-match={fragment.match}
        >
          {fragment.text}
        </mark>
      </Show>
    )}
  </For>
)
