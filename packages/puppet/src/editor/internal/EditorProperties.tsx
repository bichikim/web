import {type JSX, Show} from 'solid-js'
import type {UseEditorStateResult} from './use-editor-state'
import {EditorInspector} from './EditorInspector'
import {EditorParameterProperties} from './EditorParameterProperties'
import {DocumentHistoryPanel} from './DocumentHistoryPanel'
import {SkinningEditor} from './SkinningEditor'
import {GlueEditor} from './GlueEditor'

interface EditorPropertiesProps {
  /** Local editor view-model; document/history remain owned by its host binding. */
  readonly state: UseEditorStateResult
  /** Optional viewport editing controls, rendered before skinning and glue properties. */
  readonly children?: JSX.Element
}

export const EditorProperties = (props: EditorPropertiesProps) => (
  <EditorInspector
    selectionPending={props.state.selectionTransition.pending()}
    activeBindingId={props.state.temporary.bindingId()}
    activeKeyformValues={props.state.temporary.values()}
    activeNodeId={props.state.selectionActions().singleNodeId}
    autoMeshAvailable={
      props.state.workspace() === 'modeling' && props.state.autoMesh.targets().length > 0
    }
    containerUnwrapAvailable={props.state.selectionActions().containerIds.length > 0}
    document={props.state.temporary.document()}
    editMode={props.state.editMode()}
    history={
      <DocumentHistoryPanel
        entries={props.state.history.entries()}
        onSelect={props.state.handleHistorySelect}
      />
    }
    parameterProperties={
      <Show
        when={
          props.state.workspace() === 'modeling'
            ? props.state.parameterEditor.activeBinding()
            : undefined
        }
      >
        {(binding) => (
          <EditorParameterProperties
            binding={binding()}
            document={props.state.sourceDocument()}
            editor={props.state.parameterEditor}
            onDocumentChange={props.state.handleTimelineDocumentChange}
            onEditEnd={props.state.history.endTransaction}
            onEditStart={props.state.handleDocumentEditStart}
            onPhysicsPreviewChange={props.state.setPhysicsPreview}
            onPhysicsReset={props.state.resetPhysics}
            physicsPreview={props.state.physicsPreview()}
            selectedPartIds={props.state.selectedPartIds()}
          />
        )}
      </Show>
    }
    maskPickSourcePartId={props.state.maskPickSourcePartId() ?? undefined}
    onAutoMesh={() => props.state.autoMesh.onOpenChange(true)}
    onContainerUnwrap={props.state.handleContainerUnwrap}
    onDocumentChange={props.state.handleInspectorDocumentChange}
    onEditEnd={props.state.history.endTransaction}
    onEditStart={props.state.handleDocumentEditStart}
    onMaskPickCancel={props.state.handleMaskPickCancel}
    onMaskPickStart={props.state.handleMaskPickStart}
    previewDocument={props.state.parameterPreviewDocument()}
    selectedControlPointIndices={props.state.deformerControlSelection.selectedPointIndices()}
    targetNodeIds={props.state.temporary.targets()}
  >
    {props.children}
    <SkinningEditor
      selectedNodeIds={props.state.layerSelection().nodeIds}
      document={props.state.sourceDocument()}
      previewDocument={props.state.parameterPreviewDocument()}
      partId={props.state.activePartId() ?? undefined}
      vertexIndex={props.state.activeVertexIndex() ?? undefined}
      onDocumentChange={props.state.history.setDocument}
      onEditStart={props.state.handleDocumentEditStart}
      onEditEnd={props.state.history.endTransaction}
    />
    <GlueEditor
      activeBindingId={props.state.temporary.bindingId()}
      activeKeyformValues={props.state.temporary.values()}
      editingDocument={props.state.temporary.document()}
      editMode={props.state.editMode()}
      onKeyformChange={props.state.temporary.update}
      selectedPartIds={props.state.directlySelectedPartIds()}
      targetPartId={props.state.layerSelection().activeNodeId ?? undefined}
      sourceVertex={props.state.glueVertex()}
      onSourceChange={props.state.setGlueVertex}
      document={props.state.sourceDocument()}
      partId={props.state.activePartId() ?? undefined}
      vertexIndex={props.state.activeVertexIndex()}
      onDocumentChange={props.state.history.setDocument}
      onEditStart={props.state.handleDocumentEditStart}
      onEditEnd={props.state.history.endTransaction}
    />
  </EditorInspector>
)
