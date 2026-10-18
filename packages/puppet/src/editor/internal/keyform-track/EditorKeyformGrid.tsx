import {For, Show} from 'solid-js'
import {parameterValuesEqual, type PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter, PuppetParameterBinding} from '../../../player/document'
import {getParameterPointerValue, getParameterProgress} from '../parameter-value'
import {EditorKeyformGridMarker} from './EditorKeyformGridMarker'
import {isTouchContextRequest} from './is-touch-context-request'
import {usePointerValueDrag} from './use-pointer-value-drag'

export interface EditorKeyformGridProps {
  readonly active?: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onKeyformAdd?: (values: PuppetParameterValues) => void
  readonly onKeyformContext?: (values: PuppetParameterValues) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values: PuppetParameterValues
}

const isMarkerTarget = (event: MouseEvent) =>
  event.target instanceof Element && event.target.closest('.parameter-grid-keyform') !== null

const getGridValues = (
  parameters: ReadonlyArray<PuppetParameter>,
  bounds: DOMRect,
  event: MouseEvent,
): PuppetParameterValues | undefined => {
  const [x, y] = parameters
  return x === undefined || y === undefined
    ? undefined
    : [
        getParameterPointerValue(x, bounds.left, bounds.width, event.clientX),
        getParameterPointerValue(
          y,
          bounds.top,
          bounds.height,
          bounds.top + bounds.bottom - event.clientY,
        ),
      ]
}

export const EditorKeyformGrid = (props: EditorKeyformGridProps) => {
  const xParameter = () => props.parameters[0]
  const yParameter = () => props.parameters[1]
  const handleValueDrag = (event: PointerEvent, bounds: DOMRect) => {
    const values = getGridValues(props.parameters, bounds, event)
    if (values !== undefined) {
      props.onValueChange?.(values)
    }
  }
  const drag = usePointerValueDrag({
    enabled: () => props.onValueChange !== undefined,
    getBounds: (event) =>
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.getBoundingClientRect()
        : undefined,
    onMove: handleValueDrag,
  })
  const handleDoubleClick = (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => {
    if (isMarkerTarget(event)) {
      return
    }
    const values = getGridValues(
      props.parameters,
      event.currentTarget.getBoundingClientRect(),
      event,
    )
    if (values !== undefined) {
      event.currentTarget.parentElement?.focus()
      props.onKeyformAdd?.(values)
    }
  }
  const handleContextMenu = (event: MouseEvent & {readonly currentTarget: HTMLDivElement}) => {
    if (isMarkerTarget(event)) {
      return
    }
    const values = getGridValues(
      props.parameters,
      event.currentTarget.getBoundingClientRect(),
      event,
    )
    if (values !== undefined) {
      props.onKeyformContext?.(values)
    }
  }
  const handlePointerDown = (event: PointerEvent & {readonly currentTarget: HTMLDivElement}) => {
    if (isMarkerTarget(event)) {
      return
    }
    if (isTouchContextRequest(event)) {
      handleContextMenu(event)
    }
    drag.handlePointerDown(event)
  }
  return (
    <div
      class="parameter-grid"
      onContextMenu={handleContextMenu}
      onDblClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
    >
      <Show when={xParameter() !== undefined && yParameter() !== undefined}>
        <span
          class="parameter-grid-current-x"
          style={{
            left: `${getParameterProgress(xParameter()!, props.values[0] ?? xParameter()!.defaultValue)}%`,
          }}
        />
        <span
          class="parameter-grid-current-y"
          style={{
            bottom: `${getParameterProgress(yParameter()!, props.values[1] ?? yParameter()!.defaultValue)}%`,
          }}
        />
      </Show>
      <For each={props.binding.keyforms}>
        {(keyform) => (
          <EditorKeyformGridMarker
            active={
              props.active === true &&
              parameterValuesEqual(props.activeKeyformValues ?? [], keyform.values)
            }
            keyform={keyform}
            parameters={props.parameters}
            onContextMenu={() => props.onKeyformContext?.(keyform.values)}
            onSelect={() => props.onKeyformSelect?.(props.binding.id, keyform.values)}
          />
        )}
      </For>
    </div>
  )
}
