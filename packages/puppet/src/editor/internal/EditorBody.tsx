import {EditorProperties} from './EditorProperties'
import {createSignal, type JSX, onMount, Show, untrack} from 'solid-js'
import {Portal} from 'solid-js/web'
import type {PuppetEditorProps} from '../types'
import {useEditorState} from './use-editor-state'
import {SkinSessionContext} from './skin-session'
import {EditorWorkspacePanel} from './EditorWorkspacePanel'
import {TemporaryFormButton} from './TemporaryFormButton'
import {EditorViewport} from '../EditorViewport'
import {EditorAutoMeshDialog} from './EditorAutoMeshDialog'
import {EditorLayerPanel} from './EditorLayerPanel'
import {EditorPanelLayout} from './EditorPanelLayout'
import {EditorStyles} from './EditorStyles'
import {EditorToast} from '../../design-system'

export interface EditorBodyProps extends PuppetEditorProps {
  /** Unmounts this controller's owned computations and DOM while the public host remains mounted. */
  readonly onDispose: () => void
}

export const EditorBody = (props: EditorBodyProps) => {
  const state = useEditorState(props)
  const [brushControlsMount, setBrushControlsMount] = createSignal<HTMLDivElement>()
  const [brushSettingsMount, setBrushSettingsMount] = createSignal<HTMLDivElement>()
  const [inspectorMount, setInspectorMount] = createSignal<HTMLDivElement>()
  onMount(() => untrack(() => props.onControl?.(state.control)))
  const renderHeader = () => props.header?.(state.control, {setBrushSettingsMount})
  const renderEditingControls = (controls: JSX.Element) => (
    <Show when={inspectorMount()}>{(mount) => <Portal mount={mount()}>{controls}</Portal>}</Show>
  )
  return (
    <SkinSessionContext.Provider value={state.skinSession}>
      <EditorStyles />
      <EditorPanelLayout
        layout={state.layout}
        inactive={state.control.getState().lifecycle !== 'active'}
        onActivate={state.activateHistoryShortcuts}
        bottom={
          <EditorWorkspacePanel
            selectionPending={state.selectionTransition.panelPending()}
            setBrushControlsMount={setBrushControlsMount}
            currentTime={state.currentTime()}
            document={state.sourceDocument()}
            editor={state.parameterEditor}
            isPlaying={state.isPlaying()}
            motionId={state.activeMotionId()}
            onDocumentChange={state.handleTimelineDocumentChange}
            onEditEnd={state.history.endTransaction}
            onEditStart={state.handleDocumentEditStart}
            onMotionChange={state.handleMotionChange}
            onMotionSeek={state.hasPlayer() ? state.handleMotionSeek : undefined}
            onPlaybackToggle={state.hasPlayer() ? state.handlePlaybackToggle : undefined}
            onSeek={state.hasPlayer() ? state.handleSeek : undefined}
            selectedNodeIds={state.selectedNodeIds()}
            workspace={state.workspace()}
          />
        }
        inspector={
          <EditorProperties state={state}>
            <div class="inspector-extension-mount" ref={setInspectorMount} />
          </EditorProperties>
        }
        layers={
          <EditorLayerPanel
            document={state.sourceDocument()}
            maskPickSourcePartId={state.maskPickSourcePartId() ?? undefined}
            selection={state.selectionTransition.layers()}
            onDocumentChange={state.history.setDocument}
            onMaskPick={state.handleMaskPick}
            onSelectionChange={state.requestLayerSelection}
          />
        }
        toolbar={props.header === undefined ? undefined : renderHeader}
        viewport={
          <EditorViewport
            selectionPending={state.selectionTransition.pending()}
            brushControlsMount={brushControlsMount()}
            brushSettingsMount={brushSettingsMount()}
            physicsPreview={state.physicsPreview()}
            meshEditingDisabled={state.temporary.form() !== undefined}
            onMeshEditingStart={state.handleMeshEditingStart}
            onRestDocumentChange={state.history.setDocument}
            fitRevision={state.fitRevision()}
            overlay={
              <Show
                when={
                  state.workspace() === 'modeling' &&
                  state.temporary.form() !== undefined &&
                  state.layerSelection().activeNodeId
                }
                keyed
              >
                {(nodeId) => (
                  <TemporaryFormButton
                    nodeId={nodeId}
                    selected={state.temporary.selected()}
                    showing={state.temporary.showing()}
                    onPreview={state.temporary.setPreview}
                    onRemove={state.temporary.remove}
                    onSave={state.temporary.save}
                  />
                )}
              </Show>
            }
            sourceDocument={state.sourceDocument()}
            deformerMode={state.deformerEditing.mode()}
            onDeformerModeChange={state.deformerEditing.setMode}
            renderEditingControls={renderEditingControls}
            activeBindingId={state.temporary.bindingId()}
            activeKeyformValues={state.temporary.values()}
            activeNodeId={state.layerSelection().activeNodeId ?? undefined}
            activePartId={state.activePartId() ?? undefined}
            activeVertexIndex={state.activeVertexIndex()}
            currentTime={state.viewportTime()}
            deformerControlSelection={state.deformerControlSelection}
            document={state.temporary.document()}
            editMode={state.editMode()}
            motionId={state.activeMotionId() ?? undefined}
            onDeformerEditEnd={state.history.endTransaction}
            onDeformerEditStart={state.handleDocumentEditStart}
            onDocumentChange={state.temporary.update}
            onNotice={state.handleViewportNotice}
            onPlayerChange={state.handlePlayerChange}
            onStatusChange={state.setPlayerStatus}
            onTimeChange={state.setCurrentTime}
            onVertexEditStart={state.pausePlayback}
            onVertexSelect={state.setActiveVertexIndex}
            playbackActive={state.isPlaying()}
            parameterValues={
              state.temporary.target()?.values ?? state.parameterEditor.parameterValues()
            }
            parameterValueMap={state.temporary.valueMap()}
            previewDocument={state.parameterPreviewDocument()}
            selectedPartIds={state.meshPartIds()}
            targetNodeIds={state.temporary.targets()}
          />
        }
      />
      <EditorAutoMeshDialog autoMesh={state.autoMesh} />
      <EditorToast message={state.notice() ?? undefined} onDismiss={state.dismissNotice} />
    </SkinSessionContext.Provider>
  )
}
