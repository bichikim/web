import {createSignal, For, Show} from 'solid-js'
import {isTwoDimensionalParameterBinding, parameterValuesEqual} from '../../deformation'
import {EditorContextMenu} from './EditorContextMenu'
import {EditorKeyformMarker} from './EditorKeyformMarker'
import {
  EditorKeyformGrid,
  type EditorKeyformTrackProps,
  EditorParameterScale,
  EditorParameterValueScrubber,
  type KeyformVolumeSource,
  useKeyformTrack,
} from './keyform-track'

export interface EditorKeyformFlatTrackProps extends EditorKeyformTrackProps {
  /** 지정하면 기존 XY 격자를 현재 Z의 육면체 단면 안에 배치한다. 생략하면 평면 격자다. */
  readonly volume?: KeyformVolumeSource
}

/** The keyform track of a 1D binding, or the grid of a 2D one. */
export const EditorKeyformFlatTrack = (props: EditorKeyformFlatTrackProps) => {
  const [trackElement, setTrackElement] = createSignal<HTMLDivElement>()
  const {
    contextEntries,
    firstParameter,
    secondParameter,
    prepareContextMenu,
    handleKeyformAdd,
    handleKeyDown,
    handleDoubleClick,
    handleContextMenu,
    handleValueChange,
    handleOneDimensionalTrackPointerDown,
    handleMenuOpenChange,
    handleTriggerRequest,
    handleInteractOutside,
    handleGridContextMenu,
    restoreFocus,
  } = useKeyformTrack({source: () => props})
  const blockVolumeBackground = (event: MouseEvent) => {
    if (
      props.volume !== undefined &&
      (event.type === 'pointerdown' || event.button === 2) &&
      event.target instanceof Element &&
      event.target.closest('.parameter-grid') === null
    ) {
      event.preventDefault()
      event.stopPropagation()
      return true
    }
    return false
  }
  const handleTriggerContextMenu = (event: MouseEvent) => {
    if (!blockVolumeBackground(event)) {
      handleTriggerRequest(event)
    }
  }
  const handleGridContextRequest = (event: MouseEvent) => {
    if (!blockVolumeBackground(event)) {
      handleGridContextMenu(event)
    }
  }
  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    if (restoreFocus()) {
      trackElement()?.focus()
    }
  }
  return (
    <EditorContextMenu
      entries={contextEntries()}
      label="키폼 작업"
      disabled={contextEntries().length === 0}
      onOpenChange={handleMenuOpenChange}
      onContextMenu={handleTriggerContextMenu}
      onPointerDown={handleTriggerRequest}
      onInteractOutside={handleInteractOutside}
      onCloseAutoFocus={handleCloseAutoFocus}
    >
      <Show
        when={isTwoDimensionalParameterBinding(props.binding)}
        fallback={
          <div
            class="keyform-track parameter-line-track"
            ref={setTrackElement}
            onContextMenu={handleContextMenu}
            aria-keyshortcuts="Backspace Delete"
            aria-label={`${firstParameter()?.name ?? 'Parameter'} ${props.markerLabel ?? '키폼'} 트랙`}
            tabindex="0"
            onDblClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            onPointerDown={handleOneDimensionalTrackPointerDown}
          >
            <Show when={firstParameter()}>
              <EditorParameterValueScrubber
                parameter={firstParameter()!}
                value={props.values?.[0] ?? firstParameter()!.defaultValue}
                onValueChange={handleValueChange}
              />
            </Show>
            <Show when={firstParameter()}>
              {(parameter) => (
                <EditorParameterScale
                  parameter={parameter()}
                  occupiedValues={props.binding.keyforms.map((keyform) => keyform.values[0])}
                />
              )}
            </Show>
            <Show when={firstParameter()}>
              {(parameter) => (
                <For each={props.binding.keyforms}>
                  {(keyform) => (
                    <EditorKeyformMarker
                      showValue={false}
                      label={props.markerLabel}
                      active={
                        props.active &&
                        parameterValuesEqual(props.activeKeyformValues ?? [], keyform.values)
                      }
                      onContextMenu={() => prepareContextMenu(keyform.values)}
                      parameter={parameter()}
                      value={keyform.values[0] ?? parameter().defaultValue}
                      onMove={
                        props.onKeyformMove === undefined
                          ? undefined
                          : (value, nextValue) =>
                              props.onKeyformMove?.(props.binding.id, [value], [nextValue])
                      }
                      onSelect={() => props.onKeyformSelect?.(props.binding.id, keyform.values)}
                    />
                  )}
                </For>
              )}
            </Show>
          </div>
        }
      >
        <div
          class="keyform-track parameter-grid-track"
          classList={{'parameter-volume-track': props.volume !== undefined}}
          ref={setTrackElement}
          onContextMenu={handleGridContextRequest}
          onPointerDown={blockVolumeBackground}
          aria-keyshortcuts="Backspace Delete"
          aria-label={`${firstParameter()?.name}와 ${secondParameter()?.name} 2차원 키폼 grid`}
          tabindex="0"
          onKeyDown={handleKeyDown}
        >
          <EditorKeyformGrid
            volume={props.volume}
            active={props.active}
            activeKeyformValues={props.activeKeyformValues}
            binding={props.binding}
            parameters={props.parameters}
            values={props.values ?? [0, 0]}
            onKeyformContext={prepareContextMenu}
            onKeyformAdd={handleKeyformAdd}
            onKeyformMove={props.onKeyformMove}
            onKeyformSelect={props.onKeyformSelect}
            onValueChange={handleValueChange}
          />
        </div>
      </Show>
    </EditorContextMenu>
  )
}
