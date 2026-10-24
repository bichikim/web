import type {EditorKeyformTrackProps} from './types'
import {getVolumeSlicePosition, VOLUME_PROJECTION} from './volume-projection'
import {EditorKeyformVolumeSpace} from './EditorKeyformVolumeSpace'
import {EditorParameterScale} from './EditorParameterScale'
import type {KeyformVolumeSource} from './keyform-volume'
import {For, Show} from 'solid-js'
import {parameterValuesEqual, type PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter, PuppetParameterBinding} from '../../../player/document'
import {getParameterPointerValue, getParameterProgress} from '../parameter-value'
import {EditorKeyformGridMarker} from './EditorKeyformGridMarker'
import {isTouchContextRequest} from './is-touch-context-request'
import {usePointerValueDrag} from './use-pointer-value-drag'

const sliceWidth =
  (VOLUME_PROJECTION.width / VOLUME_PROJECTION.viewportWidth) * VOLUME_PROJECTION.percent
const sliceHeight =
  (VOLUME_PROJECTION.height / VOLUME_PROJECTION.viewportHeight) * VOLUME_PROJECTION.percent

export interface EditorKeyformGridProps {
  /** 지정한 Z 단면을 육면체 안에 표시한다. 생략하면 기존 평면 격자를 사용한다. */
  readonly volume?: KeyformVolumeSource
  readonly active?: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onKeyformAdd?: (values: PuppetParameterValues) => void
  readonly onKeyformContext?: (values: PuppetParameterValues) => void
  readonly onKeyformMove?: EditorKeyformTrackProps['onKeyformMove']
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

const prepareKeyformFocus = (grid: HTMLDivElement | undefined, values: PuppetParameterValues) => {
  if (grid === undefined) {
    return
  }
  const root = grid.getRootNode()
  if (!('activeElement' in root)) {
    return
  }
  const focused = root.activeElement
  if (!(focused instanceof HTMLButtonElement) || !grid.contains(focused)) {
    return
  }
  const outerFocused = grid.ownerDocument.activeElement
  // 문서 갱신으로 교체된 마커가 렌더링된 뒤 실제 트리 루트에 포커스를 복원한다.
  return () =>
    queueMicrotask(() => {
      if (
        grid.isConnected &&
        !focused.isConnected &&
        (root.activeElement === null || root.activeElement === grid.ownerDocument.body) &&
        (grid.ownerDocument.activeElement === grid.ownerDocument.body ||
          grid.ownerDocument.activeElement === outerFocused)
      ) {
        const label = `키폼 선택: ${values.join(', ')}`
        const marker = [...grid.querySelectorAll<HTMLButtonElement>('button')].find(
          (button) => button.getAttribute('aria-label') === label,
        )
        marker?.focus()
      }
    })
}

export const EditorKeyformGrid = (props: EditorKeyformGridProps) => {
  let gridElement: HTMLDivElement | undefined
  const handleKeyformMove = (from: PuppetParameterValues, to: PuppetParameterValues) => {
    const restoreFocus = prepareKeyformFocus(gridElement, to)
    props.onKeyformMove?.(props.binding.id, from, to)
    restoreFocus?.()
  }
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
  const depthProgress = () =>
    props.volume === undefined
      ? 0
      : getParameterProgress(props.volume.parameter, props.volume.value) / VOLUME_PROJECTION.percent
  const slicePosition = () => getVolumeSlicePosition(depthProgress())
  return (
    <div classList={{'parameter-volume-stage': props.volume !== undefined}}>
      <Show when={props.volume}>
        {(volume) => <EditorKeyformVolumeSpace source={volume()} parameters={props.parameters} />}
      </Show>
      <div
        ref={(element) => {
          gridElement = element
        }}
        class="parameter-grid"
        classList={{
          'parameter-grid-with-scale': props.volume === undefined,
          'parameter-volume-slice': props.volume !== undefined,
        }}
        style={
          props.volume === undefined
            ? undefined
            : {
                '--volume-height': `${sliceHeight}%`,
                '--volume-left': `${slicePosition().left}%`,
                '--volume-top': `${slicePosition().top}%`,
                '--volume-width': `${sliceWidth}%`,
              }
        }
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
              onMove={props.onKeyformMove === undefined ? undefined : handleKeyformMove}
              onSelect={() => props.onKeyformSelect?.(props.binding.id, keyform.values)}
            />
          )}
        </For>
        <Show when={props.volume === undefined}>
          <Show when={xParameter()}>
            {(parameter) => <EditorParameterScale axis="x" parameter={parameter()} />}
          </Show>
          <Show when={yParameter()}>
            {(parameter) => <EditorParameterScale axis="y" parameter={parameter()} />}
          </Show>
        </Show>
      </div>
    </div>
  )
}
