import {Show} from 'solid-js'
import {EditorButton, EditorNumberField} from '../design-system'
import type {ParameterMapping} from '../tracking/types'
import type {PuppetParameter} from '../player'
interface MappingBoundsProps {
  readonly expandedSections?: readonly string[]
  readonly onSectionToggle?: (section: string, open: boolean) => void
  readonly onReverse?: () => void
  readonly label: string
  readonly mapping: ParameterMapping
  readonly parameter: PuppetParameter
  readonly onChange: (patch: Partial<ParameterMapping>) => void
}
export const MappingBounds = (props: MappingBoundsProps) => (
  <div class="puppet-correction-sections">
    <details
      class="puppet-correction-section"
      open={props.expandedSections?.includes('range')}
      onToggle={(event) => props.onSectionToggle?.('range', event.currentTarget.open)}
    >
      <summary>
        <span>값 범위</span>
        <span class="puppet-correction-summary">
          {props.mapping.inputMinimum}…{props.mapping.inputMaximum} → {props.mapping.outputMinimum}…
          {props.mapping.outputMaximum}
        </span>
        <span class="puppet-icon-chevron-right" aria-hidden="true" />
      </summary>
      <div class="puppet-runtime-bounds">
        <label>
          입력 최소
          <EditorNumberField
            label={`${props.label} 입력 최소`}
            value={props.mapping.inputMinimum}
            onValueChange={(inputMinimum) => props.onChange({inputMinimum})}
            step={0.01}
          />
        </label>
        <label>
          입력 최대
          <EditorNumberField
            label={`${props.label} 입력 최대`}
            value={props.mapping.inputMaximum}
            onValueChange={(inputMaximum) => props.onChange({inputMaximum})}
            step={0.01}
          />
        </label>
        <label>
          출력 최소
          <EditorNumberField
            label={`${props.label} 출력 최소`}
            value={props.mapping.outputMinimum}
            minimum={props.parameter.minimum}
            maximum={props.parameter.maximum}
            onValueChange={(outputMinimum) => props.onChange({outputMinimum})}
            step={0.01}
          />
        </label>
        <label>
          출력 최대
          <EditorNumberField
            label={`${props.label} 출력 최대`}
            value={props.mapping.outputMaximum}
            minimum={props.parameter.minimum}
            maximum={props.parameter.maximum}
            onValueChange={(outputMaximum) => props.onChange({outputMaximum})}
            step={0.01}
          />
        </label>
      </div>
    </details>
    <details
      class="puppet-correction-section"
      open={props.expandedSections?.includes('motion')}
      onToggle={(event) => props.onSectionToggle?.('motion', event.currentTarget.open)}
    >
      <summary>
        <span>움직임</span>
        <span class="puppet-correction-summary">{props.mapping.smoothing} s</span>
        <span class="puppet-icon-chevron-right" aria-hidden="true" />
      </summary>
      <div class="puppet-runtime-bounds">
        <label>
          스무딩
          <EditorNumberField
            label={`${props.label} 스무딩`}
            minimum={0}
            maximum={2}
            step={0.01}
            value={props.mapping.smoothing}
            unit="s"
            onValueChange={(smoothing) => props.onChange({smoothing})}
          />
        </label>
        <Show when={props.onReverse}>
          <EditorButton onClick={() => props.onReverse?.()}>방향 반전</EditorButton>
        </Show>
      </div>
    </details>
  </div>
)
