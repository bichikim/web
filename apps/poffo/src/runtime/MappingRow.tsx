import {MappingBounds} from './MappingBounds'
import {MappingBaseline} from './MappingBaseline'
import {
  EditorButton,
  EditorCheckbox,
  EditorNumberField,
  EditorSelect,
} from '@winter-love/puppet/editor'
import {MAPPING_INPUTS, type ParameterMapping} from '../tracking/types'
import {getTrackingRange, TRACKING_LABELS} from '../tracking/tracking-inputs'
import {TRACKING_MULTIPLIER_RANGE} from '../tracking/multiplier'
import type {PuppetParameter} from '@winter-love/puppet/player'
import type {RuntimeControls} from './use-runtime-controls'

interface MappingRowProps {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly mapping: ParameterMapping
  readonly parameter: PuppetParameter
  readonly controls: RuntimeControls
}
const DISPLAY_DIGITS = 3
export const MappingRow = (props: MappingRowProps) => {
  const update = (patch: Partial<ParameterMapping>) =>
    props.controls.updateMapping({...props.mapping, ...patch})
  const handleInputChange = (input: string) => {
    const selected = MAPPING_INPUTS.find((candidate) => candidate === input)
    if (selected !== undefined) {
      const range = getTrackingRange(selected)
      const {baseline: _baseline, ...mapping} = props.mapping
      props.controls.updateMapping({
        ...mapping,
        input: selected,
        inputMaximum: range[1],
        inputMinimum: range[0],
      })
    }
  }
  const available = () =>
    props.parameters.filter(
      (parameter) =>
        parameter.id === props.mapping.parameterId ||
        !props.controls.profile()?.mappings.some((mapping) => mapping.parameterId === parameter.id),
    )
  const handleTargetChange = (id: string) => {
    const target = available().find((parameter) => parameter.id === id)
    if (target !== undefined) {
      props.controls.retargetMapping(props.mapping.parameterId, target)
    }
  }
  const prefix = () => props.parameter.name
  return (
    <div class="puppet-runtime-mapping">
      <div class="puppet-runtime-actions">
        <EditorCheckbox
          label={`${prefix()} 추적 활성화`}
          checked={props.mapping.enabled}
          onChange={(enabled) => update({enabled})}
        />
        <strong>{prefix()}</strong>
      </div>
      <label>
        입력
        <EditorSelect
          label={`${prefix()} 입력`}
          options={MAPPING_INPUTS}
          value={props.mapping.input}
          optionLabel={(value) => TRACKING_LABELS[value as keyof typeof TRACKING_LABELS]}
          onChange={handleInputChange}
        />
      </label>
      <label>
        모델 파라미터
        <EditorSelect
          label={`${prefix()} 모델 파라미터`}
          options={available().map((parameter) => parameter.id)}
          value={props.mapping.parameterId}
          optionLabel={(id) =>
            props.parameters.find((parameter) => parameter.id === id)?.name ?? id
          }
          onChange={handleTargetChange}
        />
      </label>
      <label>
        감도
        <EditorNumberField
          label={`${prefix()} 연결 감도`}
          minimum={TRACKING_MULTIPLIER_RANGE[0]}
          maximum={TRACKING_MULTIPLIER_RANGE[1]}
          step={0.1}
          unit="×"
          value={props.mapping.multiplier ?? 1}
          onValueChange={(multiplier) => update({multiplier})}
        />
      </label>
      <MappingBaseline
        label={prefix()}
        baseline={
          props.mapping.baseline ??
          Math.min(
            Math.max(0, Math.min(props.mapping.inputMinimum, props.mapping.inputMaximum)),
            Math.max(props.mapping.inputMinimum, props.mapping.inputMaximum),
          )
        }
        value={() => props.controls.mappingInputs()?.[props.mapping.input]}
        onChange={(baseline) => update({baseline})}
        onReset={() => {
          const {baseline: _baseline, ...mapping} = props.mapping
          props.controls.updateMapping(mapping)
        }}
      />
      <MappingBounds
        label={prefix()}
        mapping={props.mapping}
        parameter={props.parameter}
        onChange={update}
      />
      <output>
        입력 {props.controls.mappingInputs()?.[props.mapping.input]?.toFixed(DISPLAY_DIGITS) ?? '—'}{' '}
        → 적용 {props.controls.values()[props.mapping.parameterId]?.toFixed(DISPLAY_DIGITS) ?? '—'}
      </output>
      <div class="puppet-runtime-actions">
        <EditorButton
          onClick={() =>
            update({
              outputMaximum: props.mapping.outputMinimum,
              outputMinimum: props.mapping.outputMaximum,
            })
          }
        >
          방향 반전
        </EditorButton>
        <EditorButton onClick={() => props.controls.removeMapping(props.mapping.parameterId)}>
          연결 삭제
        </EditorButton>
      </div>
    </div>
  )
}
