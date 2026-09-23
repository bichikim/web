import {Show} from 'solid-js'
import {EditorSegmentedField} from '../../design-system'

export interface MeshModeControlProps {
  readonly notice?: string
  readonly editing: boolean
  readonly disabledReason?: string
  readonly onChange: (editing: boolean) => void
}

export const MeshModeControl = (props: MeshModeControlProps) => (
  <div
    class="mesh-mode-controls"
    data-tooltip={
      props.disabledReason ??
      '기준 배치는 그림을 고정하고 정점 배치를 바꿉니다. 변형 편집은 정점으로 그림을 변형합니다.'
    }
  >
    <EditorSegmentedField
      label="정점 편집 방식"
      value={props.editing ? 'mesh' : 'form'}
      options={[
        {disabled: props.disabledReason !== undefined, label: '기준 배치', value: 'mesh'},
        {label: '변형 편집', value: 'form'},
      ]}
      onChange={(value) => props.onChange(value === 'mesh')}
    />
    <Show when={props.editing && props.notice}>
      <span role="status" class="editor-hint">
        {props.notice}
      </span>
    </Show>
  </div>
)
