import {Show} from 'solid-js'
import {EditorSegmentedField} from '../../../design-system'

interface KeyformCornerSettingsProps {
  readonly onPlanesChange: (planes: 'current' | 'all') => void
  readonly onReferenceChange: (reference: 'default' | 'middle') => void
  readonly planes: 'current' | 'all'
  readonly reference: 'default' | 'middle'
  /** A 3D binding, which chooses its planes. */
  readonly volume: boolean
}

export const KeyformCornerSettings = (props: KeyformCornerSettingsProps) => (
  <>
    <label>
      <span>기준 형태</span>
      <EditorSegmentedField
        label="모서리 기준 형태"
        value={props.reference}
        onChange={props.onReferenceChange}
        options={[
          {label: '기본값', value: 'default'},
          {label: '범위 중앙', value: 'middle'},
        ]}
      />
    </label>
    <Show when={props.volume}>
      <label>
        <span>적용 평면</span>
        <EditorSegmentedField
          label="모서리 적용 평면"
          value={props.planes}
          onChange={props.onPlanesChange}
          options={[
            {label: '현재 평면', value: 'current'},
            {label: '모든 평면', value: 'all'},
          ]}
        />
      </label>
    </Show>
  </>
)
