import {createMemo, createSignal, Show} from 'solid-js'
import {EditorButton, EditorSelect} from '../design-system'
import {getTrackingRange, TRACKING_LABELS} from '../tracking/tracking-inputs'
import {MAPPING_INPUTS, type MappingInput} from '../tracking/types'
import type {PuppetDocument} from '../player'
import type {RuntimeControls} from './use-runtime-controls'
import {MappingRow} from './MappingRow'
import {KeyedFor} from '../editor/internal/KeyedFor'
interface TrackingMappingsProps {
  readonly document: PuppetDocument
  readonly controls: RuntimeControls
  readonly debug: boolean
}
export const TrackingMappings = (props: TrackingMappingsProps) => {
  const [input, setInput] = createSignal<MappingInput>('mouthOpen')
  const [parameterId, setParameterId] = createSignal<string>()
  const available = createMemo(() =>
    (props.document.parameters ?? []).filter(
      (parameter) =>
        !props.controls.profile()?.mappings.some((mapping) => mapping.parameterId === parameter.id),
    ),
  )
  const selected = () =>
    available().find((parameter) => parameter.id === parameterId()) ?? available()[0]
  const addMapping = () => {
    const parameter = selected()
    if (parameter !== undefined) {
      const range = getTrackingRange(input())
      props.controls.updateMapping({
        enabled: true,
        input: input(),
        inputMaximum: range[1],
        inputMinimum: range[0],
        outputMaximum: parameter.maximum,
        outputMinimum: range[0] < 0 ? parameter.minimum : parameter.defaultValue,
        parameterId: parameter.id,
        smoothing: 0.08,
      })
    }
  }
  return (
    <details open={!props.debug}>
      <summary>파라미터 연결</summary>
      <div class="puppet-runtime-actions">
        <EditorSelect
          label="새 연결 입력"
          options={MAPPING_INPUTS}
          value={input()}
          optionLabel={(value) => TRACKING_LABELS[value as MappingInput]}
          onChange={(value) => {
            const selected = MAPPING_INPUTS.find((candidate) => candidate === value)
            if (selected !== undefined) {
              setInput(selected)
            }
          }}
        />
        <EditorSelect
          label="연결할 파라미터"
          options={available().map((parameter) => parameter.id)}
          value={selected()?.id}
          optionLabel={(id) =>
            props.document.parameters?.find((parameter) => parameter.id === id)?.name ?? id
          }
          onChange={setParameterId}
        />
        <EditorButton disabled={selected() === undefined} onClick={addMapping}>
          연결 추가
        </EditorButton>
      </div>
      <KeyedFor
        each={props.controls.profile()?.mappings ?? []}
        key={(mapping) => mapping.parameterId}
      >
        {(mapping) => {
          const parameter = () =>
            props.document.parameters?.find((parameter) => parameter.id === mapping().parameterId)
          return (
            <Show when={parameter()}>
              {(current) => (
                <MappingRow
                  mapping={mapping()}
                  parameter={current()}
                  parameters={props.document.parameters ?? []}
                  controls={props.controls}
                />
              )}
            </Show>
          )
        }}
      </KeyedFor>
    </details>
  )
}
