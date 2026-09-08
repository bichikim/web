import {EditorSegmentedField} from '../../design-system'

export type DeformerEditMode = 'rest' | 'pose'

export interface DeformerModeProps {
  readonly mode: DeformerEditMode
  readonly restEditable?: boolean
  readonly onChange: (mode: DeformerEditMode) => void
}

export const DeformerMode = (props: DeformerModeProps) => (
  <EditorSegmentedField
    label="디포머 편집 방식"
    value={props.mode}
    options={[
      {label: '기준 배치', value: 'rest', disabled: props.restEditable === false},
      {label: '변형 편집', value: 'pose'},
    ]}
    onChange={props.onChange}
  />
)
