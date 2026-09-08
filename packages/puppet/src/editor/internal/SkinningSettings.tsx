import {Show} from 'solid-js'
import type {PuppetSkinBinding, PuppetSkinOptions} from '../../player/document'
import {EditorSegmentedField, EditorCheckbox, EditorNumberField} from '../../design-system'
interface SkinningSettingsProps {
  readonly options: PuppetSkinOptions
  readonly binding?: PuppetSkinBinding
  readonly onChange: (options: PuppetSkinOptions) => void
  readonly onSyncSeams: (checked: boolean) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}
export const SkinningSettings = (props: SkinningSettingsProps) => (
  <>
    <EditorSegmentedField
      label="가중치 배분"
      options={[
        {label: '관절형', value: 'joint'},
        {label: '부드러운형', value: 'smooth'},
      ]}
      value={props.options.mode ?? 'joint'}
      onChange={(mode) => props.onChange({...props.options, mode})}
    />
    <Show when={props.options.mode === 'smooth'}>
      <label>
        <span>영향 범위</span>
        <EditorNumberField
          label="스키닝 영향 범위"
          minimum={0.25}
          maximum={3}
          step={0.1}
          value={props.options.range ?? 1}
          onValueChange={(range) => props.onChange({...props.options, range})}
          onEditStart={props.onEditStart}
          onEditEnd={props.onEditEnd}
        />
      </label>
    </Show>
    <Show when={props.binding !== undefined}>
      <label>
        <span>경계 함께 편집</span>
        <EditorCheckbox
          label="스키닝 경계 함께 편집"
          checked={props.binding?.syncSeams ?? false}
          onChange={props.onSyncSeams}
        />
      </label>
    </Show>
  </>
)
