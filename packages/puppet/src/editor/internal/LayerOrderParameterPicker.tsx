import {EditorButton} from '../../design-system'
import {createSignal, For, Show} from 'solid-js'

import type {PuppetParameter} from '../../player'

export interface LayerOrderParameterPickerProps {
  readonly onChange: (ids: ReadonlyArray<string>) => void
  readonly parameterIds: ReadonlyArray<string>
  readonly parameters: ReadonlyArray<PuppetParameter>
}

export const LayerOrderParameterPicker = (props: LayerOrderParameterPickerProps) => {
  const [candidateId, setCandidateId] = createSignal('')
  const available = () =>
    props.parameters.filter((parameter) => !props.parameterIds.includes(parameter.id))
  const handleAdd = (event: Event) => {
    const parameterId = (event.currentTarget as HTMLSelectElement).value
    if (parameterId.length === 0) {
      return
    }
    props.onChange([...props.parameterIds, parameterId])
    setCandidateId('')
  }

  return (
    <div class="grid gap-1">
      <span class="text-[#84918c]">조건 파라미터 · 값을 합산</span>
      <div class="flex flex-wrap gap-1">
        <For each={props.parameterIds}>
          {(id) => (
            <span class="inline-flex items-center gap-1 rounded border border-[#3d5f56] px-2 py-1">
              {props.parameters.find((parameter) => parameter.id === id)?.name ?? id}
              <EditorButton
                aria-label={`${id} 제거`}
                disabled={props.parameterIds.length === 1}
                onClick={() =>
                  props.onChange(props.parameterIds.filter((parameterId) => parameterId !== id))
                }
              >
                ×
              </EditorButton>
            </span>
          )}
        </For>
      </div>
      <Show when={props.parameterIds.length === 0}>
        <span class="text-[#9caca6]">판정에 사용할 파라미터를 선택하세요.</span>
      </Show>
      <Show when={available().length > 0}>
        <select
          aria-label="조건 파라미터 추가"
          class="w-full min-w-0 rounded border border-[#35413d] bg-[#121816] p-2 text-[#dfe8e4]"
          value={candidateId()}
          onChange={handleAdd}
        >
          <option value="">파라미터 추가…</option>
          <For each={available()}>
            {(parameter) => <option value={parameter.id}>{parameter.name}</option>}
          </For>
        </select>
      </Show>
    </div>
  )
}
