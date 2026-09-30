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
      '기준 배치는 그림을 고정하고 정점 배치를 바꿉니다. 키폼 변형은 정점으로 그림을 변형합니다.'
    }
  >
    <EditorSegmentedField
      label="정점 편집 방식"
      size="md"
      value={props.editing ? 'mesh' : 'form'}
      options={[
        {
          disabled: props.disabledReason !== undefined,
          icon: 'puppet-icon-mesh',
          label: '기준 배치',
          value: 'mesh',
        },
        {icon: 'puppet-icon-curve', label: '키폼 변형', value: 'form'},
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
