import {Button} from '@kobalte/core/button'

import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding} from '../../player/document'

export interface EditorKeyformToolbarProps {
  readonly activeBinding?: PuppetParameterBinding
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  readonly onParameterAdd?: () => void
  readonly onTwoDimensionalParameterAdd?: () => void
  readonly parameterCreationAvailable?: boolean
  readonly titleId: string
}

export const EditorKeyformToolbar = (props: EditorKeyformToolbarProps) => {
  const hasActiveKeyform = () =>
    props.activeKeyformValues !== null && props.activeKeyformValues !== undefined

  return (
    <header class="keyform-toolbar">
      <div class="keyform-parameter-heading">
        <span id={props.titleId}>Parameters</span>
        <Button
          aria-label="1차원 Parameter 추가"
          class="panel-add-button"
          disabled={
            props.parameterCreationAvailable === false || props.onParameterAdd === undefined
          }
          type="button"
          onClick={() => props.onParameterAdd?.()}
        >
          + 1D
        </Button>
        <Button
          aria-label="2차원 Parameter 추가"
          class="panel-add-button"
          disabled={
            props.parameterCreationAvailable === false ||
            props.onTwoDimensionalParameterAdd === undefined
          }
          type="button"
          onClick={() => props.onTwoDimensionalParameterAdd?.()}
        >
          + 2D
        </Button>
      </div>
      <div class="keyform-actions">
        <button
          disabled={props.activeBinding === undefined || props.onKeyformAdd === undefined}
          type="button"
          onClick={() => props.onKeyformAdd?.()}
        >
          + 현재 값에 키폼
        </button>
        <button
          class="danger"
          disabled={!hasActiveKeyform() || props.onKeyformDelete === undefined}
          type="button"
          onClick={() => props.onKeyformDelete?.()}
        >
          선택 키폼 삭제
        </button>
      </div>
    </header>
  )
}
