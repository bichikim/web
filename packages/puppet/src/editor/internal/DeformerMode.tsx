import {ToggleButton} from '@kobalte/core/toggle-button'

export type DeformerEditMode = 'rest' | 'pose'

export interface DeformerModeProps {
  readonly mode: DeformerEditMode
  readonly restEditable?: boolean
  readonly onChange: (mode: DeformerEditMode) => void
}

export const DeformerMode = (props: DeformerModeProps) => (
  <>
    <ToggleButton
      class="mask-action-button"
      pressed={props.mode === 'rest'}
      disabled={props.restEditable === false}
      onClick={() => props.onChange('rest')}
    >
      기준 배치
    </ToggleButton>
    <ToggleButton
      class="mask-action-button"
      pressed={props.mode === 'pose'}
      onClick={() => props.onChange('pose')}
    >
      변형 편집
    </ToggleButton>
  </>
)
