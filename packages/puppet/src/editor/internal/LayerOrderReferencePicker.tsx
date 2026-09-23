import {createSignal, For} from 'solid-js'

import type {PuppetDocument} from '../../player'
import {getSceneNode} from './scene-graph'

export interface LayerOrderReferencePickerProps {
  readonly document: PuppetDocument
  readonly onChange: (partId: string) => void
  readonly targetIds: ReadonlyArray<string>
  readonly value: string
}

export const LayerOrderReferencePicker = (props: LayerOrderReferencePickerProps) => {
  const [query, setQuery] = createSignal('')
  const options = () => {
    const normalizedQuery = query().trim().toLocaleLowerCase()
    return props.document.parts.filter((part) => {
      if (props.targetIds.includes(part.id)) {
        return false
      }
      const name = getSceneNode(props.document, part.id)?.name ?? part.id
      return (
        part.id === props.value ||
        normalizedQuery.length === 0 ||
        name.toLocaleLowerCase().includes(normalizedQuery) ||
        part.id.toLocaleLowerCase().includes(normalizedQuery)
      )
    })
  }

  return (
    <div class="grid gap-1">
      <span class="text-[#84918c]">기준 파츠</span>
      <input
        aria-label="기준 파츠 검색"
        placeholder="이름으로 검색"
        type="search"
        value={query()}
        class="w-full min-w-0 rounded border border-[#35413d] bg-[#121816] p-2 text-[#dfe8e4]"
        onInput={(event) => setQuery(event.currentTarget.value)}
      />
      <select
        aria-label="기준 파츠"
        class="w-full min-w-0 rounded border border-[#35413d] bg-[#121816] p-2 text-[#dfe8e4]"
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        <option value="">기준 파츠 선택…</option>
        <For each={options()}>
          {(part) => (
            <option value={part.id}>
              {getSceneNode(props.document, part.id)?.name ?? part.id}
            </option>
          )}
        </For>
      </select>
    </div>
  )
}
