import {EditorSegmentedField} from '../../design-system'
import {Show} from 'solid-js'
import {Portal} from 'solid-js/web'

export type DeformerEditMode = 'rest' | 'pose'

export interface DeformerModeProps {
  readonly mode: DeformerEditMode
  readonly restEditable?: boolean
  readonly onChange: (mode: DeformerEditMode) => void
  /** Shared modeling toolbar host. When omitted, renders at its local position. */
  readonly mount?: HTMLDivElement
}

export const DeformerMode = (props: DeformerModeProps) => {
  const controls = (
    <div
      class="mesh-mode-controls"
      data-tooltip={
        props.restEditable === false
          ? '기준 배치는 잠금을 해제하고 파라미터 연결 전에 편집하세요.'
          : '기준 배치는 메시 모양을 유지하며 제어점을 배치합니다. 변형 편집은 제어점으로 메시를 변형합니다.'
      }
    >
      <EditorSegmentedField
        label="디포머 편집 방식"
        size={props.mount === undefined ? 'sm' : 'md'}
        value={props.mode}
        options={[
          {
            disabled: props.restEditable === false,
            icon: 'puppet-icon-rest-placement',
            label: '기준 배치',
            value: 'rest',
          },
          {icon: 'puppet-icon-keyform-deform', label: '변형 편집', value: 'pose'},
        ]}
        onChange={props.onChange}
      />
    </div>
  )
  return (
    <Show when={props.mount} fallback={controls}>
      {(mount) => <Portal mount={mount()}>{controls}</Portal>}
    </Show>
  )
}
