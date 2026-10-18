import {createUniqueId, For, Show} from 'solid-js'
import {EditorParameterFooter} from './EditorParameterFooter'
import {EditorKeyformPanelToolbar} from './EditorKeyformPanelToolbar'
import {EditorKeyformTrack} from './EditorKeyformTrack'
import {EditorKeyformTrackLabel} from './keyform-track'
import type {EditorKeyformPanelProps} from './editor-keyform-panel-props'
import {createKeyformPanelModel} from './keyform-panel-model'

const handleTrackScroll = (event: Event & {readonly currentTarget: HTMLDivElement}) => {
  const current = event.currentTarget
  const tracks = current.parentElement?.parentElement?.querySelectorAll('.keyform-track-scroll')
  tracks?.forEach((track) => {
    if (track !== current) {
      track.scrollLeft = current.scrollLeft
    }
  })
}

export const EditorKeyformPanel = (props: EditorKeyformPanelProps) => {
  const titleId = createUniqueId()
  const {activeBinding, activePreview, bindingParameters, bindingValues} =
    createKeyformPanelModel(props)
  return (
    <section class="keyform-panel" aria-labelledby={titleId}>
      <EditorKeyformPanelToolbar
        activeBinding={activeBinding}
        activePreview={activePreview}
        source={props}
        titleId={titleId}
      />
      <Show
        when={props.bindings.length > 0}
        fallback={<p class="timeline-empty">Parameter를 추가하세요.</p>}
      >
        <div class="keyform-track-wrap">
          <For each={props.bindings.map((binding) => binding.id)}>
            {(bindingId) => {
              const binding = () => props.bindings.find((item) => item.id === bindingId)!
              const parameters = () => bindingParameters(binding())
              return (
                <div class="keyform-binding-row" data-binding-id={bindingId}>
                  <div class="keyform-track-scroll" onScroll={handleTrackScroll}>
                    <div class="keyform-tracks">
                      <EditorKeyformTrack
                        active={bindingId === props.activeBindingId}
                        activeKeyformValues={props.activeKeyformValues}
                        binding={binding()}
                        parameters={parameters()}
                        values={bindingValues(binding())}
                        onBindingSelect={props.onBindingSelect}
                        onKeyformAdd={
                          props.previewBindingIds?.has(bindingId) ? undefined : props.onKeyformAdd
                        }
                        onKeyformDelete={
                          props.previewBindingIds?.has(bindingId)
                            ? undefined
                            : props.onKeyformDelete
                        }
                        onKeyformMove={props.onKeyformMove}
                        onKeyformSelect={props.onKeyformSelect}
                        onValueChange={props.onValueChange}
                      />
                    </div>
                  </div>
                  <div class="keyform-track-labels">
                    <EditorKeyformTrackLabel
                      active={bindingId === props.activeBindingId}
                      binding={binding()}
                      influence={props.bindingInfluences?.get(bindingId)}
                      previewOnly={props.previewBindingIds?.has(bindingId)}
                      parameters={parameters()}
                      values={bindingValues(binding())}
                      onBindingDelete={
                        props.previewBindingIds?.has(bindingId) ? undefined : props.onBindingDelete
                      }
                      onBindingSelect={props.onBindingSelect}
                      onEditEnd={props.onEditEnd}
                      onEditStart={props.onEditStart}
                      onParameterNameChange={props.onParameterNameChange}
                      onValueChange={props.onValueChange}
                    />
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
      <EditorParameterFooter
        activeBinding={activeBinding()}
        allParametersVisible={props.allParametersVisible}
        selectedPartIds={props.selectedPartIds}
        targetPartIds={props.targetPartIds}
        onAllParametersVisibleChange={props.onAllParametersVisibleChange}
        onSelectionConnect={props.onSelectionConnect}
        onSelectionDisconnect={props.onSelectionDisconnect}
      />
    </section>
  )
}
