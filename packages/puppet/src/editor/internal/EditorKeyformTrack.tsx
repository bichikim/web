import {createSignal, For, Show} from 'solid-js'
import {isTwoDimensionalParameterBinding, parameterValuesEqual} from '../../deformation'
import {EditorContextMenu} from './EditorContextMenu'
import {EditorKeyformMarker} from './EditorKeyformMarker'
import {
  EditorKeyformGrid,
  type EditorKeyformTrackProps,
  EditorParameterValueScrubber,
  useKeyformTrack,
} from './keyform-track'

export type {EditorKeyformTrackProps} from './keyform-track'

export const EditorKeyformTrack = (props: EditorKeyformTrackProps) => {
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
      disabled={props.onKeyformAdd === undefined && props.onKeyformDelete === undefined}
      onOpenChange={handleMenuOpenChange}
      onContextMenu={handleTriggerRequest}
      onPointerDown={handleTriggerRequest}
      onInteractOutside={handleInteractOutside}
      onCloseAutoFocus={handleCloseAutoFocus}
    >
      <Show
        when={isTwoDimensionalParameterBinding(props.binding)}
        fallback={
          <div
            class="keyform-track"
            ref={setTrackElement}
            onContextMenu={handleContextMenu}
            aria-keyshortcuts="Backspace Delete"
            aria-label={`${firstParameter()?.name ?? 'Parameter'} 키폼 트랙`}
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
                <For each={props.binding.keyforms}>
                  {(keyform) => (
                    <EditorKeyformMarker
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
          ref={setTrackElement}
          onContextMenu={handleGridContextMenu}
          aria-keyshortcuts="Backspace Delete"
          aria-label={`${firstParameter()?.name}와 ${secondParameter()?.name} 2차원 키폼 grid`}
          tabindex="0"
          onKeyDown={handleKeyDown}
        >
          <EditorKeyformGrid
            active={props.active}
            activeKeyformValues={props.activeKeyformValues}
            binding={props.binding}
            parameters={props.parameters}
            values={props.values ?? [0, 0]}
            onKeyformContext={prepareContextMenu}
            onKeyformAdd={handleKeyformAdd}
            onKeyformSelect={props.onKeyformSelect}
            onValueChange={handleValueChange}
          />
        </div>
      </Show>
    </EditorContextMenu>
  )
}
