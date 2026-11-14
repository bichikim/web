import {CUSTOM_REFERENCE} from '../use-keyform-tools'
import {EditorNumberField, EditorSegmentedField, EditorSelect} from '../../../design-system'
import type {PuppetParameter} from '../../../player'
import type {MirrorAxisReference} from '../mirror-axis-references'

interface KeyformMirrorSettingsProps {
  readonly axis: 'x' | 'y'
  readonly center: number
  readonly centerReference: string
  readonly centers?: ReadonlyArray<MirrorAxisReference>
  readonly onAxisChange: (axis: 'x' | 'y') => void
  readonly onCenterChange: (center: number) => void
  readonly onCenterReferenceChange: (reference: string) => void
  readonly onParameterChange: (parameterId: string) => void
  readonly parameterId: string
  readonly parameters: readonly PuppetParameter[]
}

/** Direction, parameter and mesh axis of motion mirroring. */
export const KeyformMirrorSettings = (props: KeyformMirrorSettingsProps) => (
  <>
    <label>
      <span>반전 방향</span>
      <EditorSegmentedField
        label="동작 반전 방향"
        value={props.axis}
        onChange={props.onAxisChange}
        options={[
          {label: '좌우', value: 'x'},
          {label: '상하', value: 'y'},
        ]}
      />
    </label>
    <label>
      <span>반전할 파라미터</span>
      <EditorSelect
        label="반전할 파라미터"
        value={props.parameterId}
        options={props.parameters.map((parameter) => parameter.id)}
        optionLabel={(id) => props.parameters.find((parameter) => parameter.id === id)?.name ?? id}
        onChange={props.onParameterChange}
      />
    </label>
    <label>
      <span>기준 위치</span>
      <EditorSelect
        label="메시 반전 기준 위치"
        value={props.centerReference}
        options={[CUSTOM_REFERENCE, ...(props.centers ?? []).map((_, index) => String(index))]}
        optionLabel={(value) =>
          value === CUSTOM_REFERENCE
            ? '직접 입력'
            : (props.centers?.[Number(value)]?.label ?? value)
        }
        onChange={props.onCenterReferenceChange}
      />
    </label>
    <label>
      <span>메시 반전 기준 {props.axis.toUpperCase()}</span>
      <EditorNumberField
        label="메시 반전 기준"
        value={props.center}
        onValueChange={props.onCenterChange}
      />
    </label>
  </>
)
