import {EditorToggleButton} from '../../design-system'

interface WeightToolButtonsProps {
  readonly tool: 'paint' | 'select'
  readonly onChange: (tool: 'paint' | 'select') => void
}

export const WeightToolButtons = (props: WeightToolButtonsProps) => (
  <div class="weight-tool-options" role="group" aria-label="영향도 편집 방식">
    <EditorToggleButton
      class="mask-action-button"
      pressed={props.tool === 'paint'}
      onClick={() => props.onChange('paint')}
    >
      브러시
    </EditorToggleButton>
    <EditorToggleButton
      class="mask-action-button"
      pressed={props.tool === 'select'}
      onClick={() => props.onChange('select')}
    >
      정점 선택
    </EditorToggleButton>
  </div>
)
