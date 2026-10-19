import {getOwner, runWithOwner} from 'solid-js'
import {EditorDiamondButton} from '../../../design-system'
import type {PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter} from '../../../player/document'
import {
  getParameterKeyboardValue,
  getParameterPointerValue,
  getParameterProgress,
} from '../parameter-value'
import {usePointerValueDrag} from './use-pointer-value-drag'

export interface EditorParameterValueScrubberProps {
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameter: PuppetParameter
  readonly value: number
}
export const EditorParameterValueScrubber = (props: EditorParameterValueScrubberProps) => {
  const owner = getOwner()
  const handleValueDrag = (event: PointerEvent, bounds: DOMRect) => {
    props.onValueChange?.([
      getParameterPointerValue(props.parameter, bounds.left, bounds.width, event.clientX),
    ])
  }
  const {handlePointerDown} = usePointerValueDrag({
    enabled: () => props.onValueChange !== undefined,
    getBounds: (event) =>
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.parentElement?.getBoundingClientRect()
        : undefined,
    onMove: handleValueDrag,
    stopPropagation: true,
  })
  const handleKeyDown = (event: KeyboardEvent) => {
    const value = getParameterKeyboardValue(props.parameter, props.value, event.key)
    if (value !== undefined) {
      event.preventDefault()
      const update = () => props.onValueChange?.([value])
      if (owner === null) {
        update()
      } else {
        runWithOwner(owner, update)
      }
    }
  }
  return (
    <EditorDiamondButton
      aria-label={`${props.parameter.name} 현재 값`}
      aria-orientation="horizontal"
      aria-valuemax={props.parameter.maximum}
      aria-valuemin={props.parameter.minimum}
      aria-valuenow={props.value}
      class="keyform-value-indicator"
      role="slider"
      style={{left: `${getParameterProgress(props.parameter, props.value)}%`}}
      type="button"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    />
  )
}
