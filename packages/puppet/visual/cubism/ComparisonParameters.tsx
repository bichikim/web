import {TextField} from '@kobalte/core/text-field'
import {createMemo, createSignal, For, type JSX} from 'solid-js'
import {EditorButton, EditorRangeInput, EditorTextInput} from '../../src/design-system'
import type {PuppetParameter} from '../../src/player/document'
import type {ComparisonSnapshot} from './types'

interface ComparisonParametersProps {
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly snapshot?: ComparisonSnapshot
  readonly disabled?: boolean
  readonly onClear?: () => void
  readonly onParameterChange?: (id: string, value: number | undefined) => void
}
const DECIMAL_PLACES = 4
const shown = (value: number | undefined) => (value ?? 0).toFixed(DECIMAL_PLACES)

export const ComparisonParameters = (props: ComparisonParametersProps) => {
  const [search, setSearch] = createSignal('')
  const parameters = createMemo(() => {
    const query = search().toLowerCase()
    return (props.parameters ?? []).filter((parameter) =>
      `${parameter.name} ${parameter.id}`.toLowerCase().includes(query),
    )
  })
  const value = (parameter: PuppetParameter) =>
    props.snapshot?.overrides[parameter.id] ??
    props.snapshot?.sdkValues[parameter.id] ??
    parameter.defaultValue
  return (
    <aside
      aria-label="공통 파라미터"
      class="editor-scrollbars w-56 shrink-0 overflow-auto border-l border-solid border-[#27302d] bg-[#101513] p-2"
    >
      <style>{`@unocss-placeholder`}</style>
      <div class="flex flex-col gap-2">
        <TextField value={search()} onChange={setSearch}>
          <EditorTextInput aria-label="파라미터 검색" placeholder="파라미터 검색" />
        </TextField>
        <EditorButton disabled={props.disabled} onClick={() => props.onClear?.()}>
          수동값 초기화
        </EditorButton>
        <For each={parameters()}>
          {(parameter) => {
            const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
              props.onParameterChange?.(parameter.id, Number(event.currentTarget.value))
            const handleReset = () => props.onParameterChange?.(parameter.id, undefined)
            return (
              <fieldset class="m-0 min-w-0 border-0 p-0 pb-2">
                <legend class="editor-type-caption">{parameter.name}</legend>
                <EditorRangeInput
                  aria-label={`${parameter.name} 공통값`}
                  class="w-full"
                  min={parameter.minimum}
                  max={parameter.maximum}
                  step="any"
                  value={value(parameter)}
                  disabled={props.disabled}
                  onInput={handleInput}
                />
                <div class="editor-type-numeric flex items-center justify-between gap-1 text-[#b9c5c0]">
                  <span>
                    SDK{' '}
                    <output aria-label={`${parameter.name} SDK 값`}>
                      {shown(props.snapshot?.sdkValues[parameter.id])}
                    </output>
                  </span>
                  <span>
                    Poffo{' '}
                    <output aria-label={`${parameter.name} Poffo 값`}>
                      {shown(props.snapshot?.poffoValues[parameter.id])}
                    </output>
                  </span>
                  <EditorButton
                    aria-label={`${parameter.name} 수동값 해제`}
                    disabled={props.snapshot?.overrides[parameter.id] === undefined}
                    onClick={handleReset}
                  >
                    해제
                  </EditorButton>
                </div>
              </fieldset>
            )
          }}
        </For>
      </div>
    </aside>
  )
}
