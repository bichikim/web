import {EditorButton, EditorNumberField} from '../../design-system'
import type {useDeformerWeights} from './use-deformer-weights'

export interface WeightSelectionControlsProps {
  readonly editor: ReturnType<typeof useDeformerWeights>
}
export const WeightSelectionControls = (props: WeightSelectionControlsProps) => {
  const PERCENT = 100
  return (
    <>
      <p class="mask-empty-state">
        Shift를 누르고 정점을 선택하면 여러 정점을 함께 수정할 수 있습니다.
      </p>
      <div class="weight-tool-options">
        <EditorButton class="mask-action-button" onClick={props.editor.selectAll}>
          모두 선택
        </EditorButton>
        <EditorButton
          class="mask-action-button"
          onClick={props.editor.clearSelection}
          disabled={props.editor.selectionCount() === 0}
        >
          선택 해제
        </EditorButton>
      </div>
      <fieldset class="deformer-properties">
        <legend>선택 정점 {props.editor.selectionCount()}개</legend>
        <label>
          일괄 값
          <EditorNumberField
            label="일괄 영향도"
            value={props.editor.batchWeight() * PERCENT}
            minimum={0}
            maximum={100}
            unit="%"
            onValueChange={(value) => props.editor.setBatchWeight(value / PERCENT)}
          />
        </label>
        <EditorButton
          class="mask-action-button"
          disabled={!props.editor.canApply()}
          onClick={() => props.editor.applySelection()}
        >
          선택 정점에 적용
        </EditorButton>
        <EditorButton
          class="mask-action-button"
          disabled={!props.editor.canApply()}
          onClick={() => props.editor.applySelection(true)}
        >
          선택 정점 자동 복원
        </EditorButton>
      </fieldset>
    </>
  )
}
