import {EditorDiamondButton} from '../../../design-system'
import type {PuppetParameter, PuppetParameterKeyform} from '../../../player/document'
import {getParameterProgress} from '../parameter-value'
import {isTouchContextRequest} from './is-touch-context-request'

export interface EditorKeyformGridMarkerProps {
  readonly active?: boolean
  readonly keyform: PuppetParameterKeyform
  readonly onContextMenu?: () => void
  readonly onSelect?: () => void
  readonly parameters: ReadonlyArray<PuppetParameter>
}

export const EditorKeyformGridMarker = (props: EditorKeyformGridMarkerProps) => {
  const x = () => props.parameters[0]
  const y = () => props.parameters[1]
  const handleClick = (event: MouseEvent & {readonly currentTarget: HTMLButtonElement}) => {
    event.stopPropagation()
    event.currentTarget.focus()
    props.onSelect?.()
  }
  const handlePointerDown = (event: PointerEvent) => {
    if (isTouchContextRequest(event)) {
      props.onContextMenu?.()
    }
  }
  return (
    <EditorDiamondButton
      aria-label={`키폼 선택: ${props.keyform.values.join(', ')}`}
      aria-pressed={props.active === true}
      data-tooltip={`키폼 선택: ${props.keyform.values.join(', ')}`}
      class="parameter-grid-keyform"
      classList={{selected: props.active === true}}
      style={{
        bottom: `${y() === undefined ? 0 : getParameterProgress(y()!, props.keyform.values[1] ?? 0)}%`,
        left: `${x() === undefined ? 0 : getParameterProgress(x()!, props.keyform.values[0] ?? 0)}%`,
      }}
      type="button"
      onContextMenu={() => props.onContextMenu?.()}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    />
  )
}
