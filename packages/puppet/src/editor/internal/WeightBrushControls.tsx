import {For} from 'solid-js'
import {EditorNumberField, EditorToggleButton} from '../../design-system'
import type {WeightPaintMode} from './weight-paint'

interface WeightBrushControlsProps {
  readonly mode: WeightPaintMode
  readonly radius: number
  readonly strength: number
  readonly labelPrefix?: string
  readonly maximumRadius?: number
  readonly onModeChange: (mode: WeightPaintMode) => void
  readonly onRadiusChange: (radius: number) => void
  readonly onStrengthChange: (strength: number) => void
}

export const WeightBrushControls = (props: WeightBrushControlsProps) => (
  <>
    <div class="weight-tool-options" role="group" aria-label="브러시 동작">
      <For each={['add', 'subtract', 'smooth'] as const}>
        {(mode) => (
          <EditorToggleButton
            class="mask-action-button"
            pressed={props.mode === mode}
            onClick={() => props.onModeChange(mode)}
          >
            {{add: '더하기', smooth: '부드럽게', subtract: '빼기'}[mode]}
          </EditorToggleButton>
        )}
      </For>
    </div>
    <fieldset class="deformer-properties">
      <legend>브러시 설정</legend>
      <label>
        반경
        <EditorNumberField
          label={`${props.labelPrefix ?? ''}브러시 반경`}
          value={props.radius}
          minimum={1}
          maximum={props.maximumRadius}
          onValueChange={props.onRadiusChange}
        />
      </label>
      <label>
        강도
        <EditorNumberField
          label={`${props.labelPrefix ?? ''}브러시 강도`}
          value={props.strength}
          minimum={1}
          maximum={100}
          unit="%"
          onValueChange={props.onStrengthChange}
        />
      </label>
    </fieldset>
  </>
)
