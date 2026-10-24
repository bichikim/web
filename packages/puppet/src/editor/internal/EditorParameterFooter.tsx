import {EditorButton, EditorToggleButton} from '../../design-system'
import type {PuppetParameterBinding} from '../../player/document'

export interface EditorParameterFooterProps {
  readonly activeBinding?: PuppetParameterBinding
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly allParametersVisible?: boolean
  readonly onAllParametersVisibleChange?: (visible: boolean) => void
  readonly onSelectionConnect?: () => void
  readonly onSelectionDisconnect?: () => void
}

export const EditorParameterFooter = (props: EditorParameterFooterProps) => {
  const selectedTargetCount = () => {
    const targets = new Set(props.targetPartIds ?? [])
    return (props.selectedPartIds ?? []).filter((id) => targets.has(id)).length
  }
  return (
    <footer class="keyform-footer">
      <div class="parameter-target-actions">
        <EditorToggleButton
          class="parameter-visibility-toggle"
          pressed={props.allParametersVisible === true}
          onClick={() => props.onAllParametersVisibleChange?.(props.allParametersVisible !== true)}
        >
          모든 파라미터 보기
        </EditorToggleButton>
        <EditorButton
          disabled={
            props.activeBinding === undefined ||
            (props.selectedPartIds ?? []).length === 0 ||
            selectedTargetCount() === (props.selectedPartIds ?? []).length ||
            props.onSelectionConnect === undefined
          }
          type="button"
          onClick={() => props.onSelectionConnect?.()}
        >
          선택 레이어 연결
        </EditorButton>
        <EditorButton
          disabled={
            props.activeBinding === undefined ||
            selectedTargetCount() === 0 ||
            props.onSelectionDisconnect === undefined
          }
          type="button"
          onClick={() => props.onSelectionDisconnect?.()}
        >
          선택 레이어 연결 해제
        </EditorButton>
      </div>
      <p class="keyform-help">
        대상 {(props.targetPartIds ?? []).length} · 선택 {(props.selectedPartIds ?? []).length}개
        노드
      </p>
    </footer>
  )
}
