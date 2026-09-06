import {Button} from '@kobalte/core/button'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {Show} from 'solid-js'
import type {PuppetParameterBinding} from '../../player/document'

const WHOLE_PERCENT = 100

export interface EditorParameterFooterProps {
  readonly activeBinding?: PuppetParameterBinding
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly influence?: number
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
        <ToggleButton
          class="parameter-visibility-toggle"
          pressed={props.allParametersVisible === true}
          onClick={() => props.onAllParametersVisibleChange?.(props.allParametersVisible !== true)}
        >
          모든 파라미터 보기
        </ToggleButton>
        <Button
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
        </Button>
        <Button
          disabled={
            props.activeBinding === undefined ||
            selectedTargetCount() === 0 ||
            props.onSelectionDisconnect === undefined
          }
          type="button"
          onClick={() => props.onSelectionDisconnect?.()}
        >
          선택 레이어 연결 해제
        </Button>
      </div>
      <Show when={props.activeBinding}>
        {(binding) => (
          <div class="influence-actions">
            <span class="keyform-help">
              미리보기 적용량 {Number(((props.influence ?? 1) * WHOLE_PERCENT).toFixed(1))}%
              {' · 원본 키폼 편집'}
            </span>
          </div>
        )}
      </Show>
      <p class="keyform-help">
        대상 {(props.targetPartIds ?? []).length} · 선택 {(props.selectedPartIds ?? []).length}개
        노드
      </p>
    </footer>
  )
}
