import {For, Show} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import {type PuppetDocument, type PuppetSceneDeformerNode, type PuppetSceneNode} from '../../player'
import {getSceneNode} from './scene-graph'
import {createDeformerHandlers} from './deformer-inspector-handlers'
import {DeformerRenderProperties} from './DeformerRenderProperties'
import {DocumentProperties} from './DocumentProperties'
import {createPartPropertiesController} from './part-properties-controller'
import {GroupProperties} from './GroupProperties'
import {getSceneGroup} from './group-properties'
import {setMaskTarget} from './mask-targets'
import {PartProperties} from './PartProperties'
import {getMaskTargetOptions} from './mask-target-options'
import {EditorInspectorActions} from './EditorInspectorActions'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import type {EditorInspectorProps} from './inspector/types'
export type {EditorInspectorProps} from './inspector/types'
import {createInspectorNodeActions} from './inspector/create-inspector-node-actions'
import {DeformerInspectorFields} from './inspector/DeformerInspectorFields'
import {DeformerPointProperties} from './inspector/DeformerPointProperties'

const getSelectedControlPointIndices = (
  node: PuppetSceneDeformerNode | undefined,
  indices: ReadonlyArray<number> | undefined,
): ReadonlyArray<number> =>
  node === undefined ||
  node.deformerType === 'spatial' ||
  node.boneRestPoints !== undefined ||
  node.pins !== undefined
    ? []
    : [...new Set(indices ?? [])].filter(
        (pointIndex) => pointIndex >= 0 && pointIndex < node.controlPoints.length / 2,
      )

const getActiveNode = (document: PuppetDocument, nodeId: string | undefined) =>
  nodeId === undefined ? undefined : getSceneNode(document, nodeId)

const getDeformerNode = (node: PuppetSceneNode | undefined) =>
  node?.kind === 'deformer' ? node : undefined

/** The selected keyform of the active parameter while editing parameters. */
const activeKeyform = (
  editMode: EditorInspectorProps['editMode'],
  bindingId: string | undefined,
  values: PuppetParameterValues | null | undefined,
) =>
  editMode === 'parameter' && bindingId !== undefined && values !== undefined && values !== null
    ? {bindingId, values}
    : undefined

export const EditorInspector = (props: EditorInspectorProps) => {
  const activeNode = () =>
    getActiveNode(props.previewDocument ?? props.document, props.activeNodeId)
  const deformerNode = () => getDeformerNode(activeNode())
  const partProperties = createPartPropertiesController(props)
  const {handleGridPointChange, handleTransformChange} = createInspectorNodeActions(
    props,
    activeNode,
  )
  const {handleCurveToggle, handleGridDivisionChange} = createDeformerHandlers(props, deformerNode)
  return (
    <aside
      class="panel inspector-panel"
      aria-label="선택 작업"
      inert={props.selectionPending}
      aria-busy={props.selectionPending || undefined}
    >
      <div class="inspector-content">
        {props.history}
        <EditorInspectorActions
          containerUnwrapAvailable={props.containerUnwrapAvailable}
          onContainerUnwrap={props.onContainerUnwrap}
        />
        <Show
          when={partProperties.activePart()}
          fallback={
            <Show when={props.autoMeshAvailable && props.onAutoMesh !== undefined}>
              <EditorPropertyGroup title="파트 렌더링">
                <EditorInspectorActions autoMeshAvailable onAutoMesh={props.onAutoMesh} />
              </EditorPropertyGroup>
            </Show>
          }
        >
          {(part) => (
            <PartProperties
              autoMeshAvailable={props.autoMeshAvailable}
              document={props.document}
              maskTargetOptions={getMaskTargetOptions(props.document, part().id)}
              maskPicking={props.maskPickSourcePartId === part().id}
              part={part()}
              staticDisabled={!partProperties.canEditStatic() || props.editMode !== 'parameter'}
              spatialDisabled={!partProperties.canEditRest() || props.editMode !== 'parameter'}
              visualDisabled={!partProperties.canEditVisual()}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onAutoMesh={props.onAutoMesh}
              onInterpolatedChange={(properties) =>
                partProperties.update(part(), properties, props.editMode === 'parameter')
              }
              onMaskTargetChange={(targetPartId, checked) => {
                const document = setMaskTarget({
                  checked,
                  document: props.document,
                  maskPartId: part().id,
                  targetPartId,
                })
                if (document !== undefined) {
                  props.onDocumentChange?.(document)
                }
              }}
              onMaskPickCancel={props.onMaskPickCancel}
              onMaskPickStart={props.onMaskPickStart}
              onStaticChange={(properties) => partProperties.update(part(), properties, false)}
              onDocumentChange={props.onDocumentChange}
            />
          )}
        </Show>
        <Show when={getSceneGroup(props.document, props.activeNodeId)}>
          {(group) => (
            <GroupProperties
              disabled={!partProperties.canEditStatic() || props.editMode !== 'parameter'}
              document={props.document}
              group={group()}
              keyform={activeKeyform(
                props.editMode,
                props.activeBindingId,
                props.activeKeyformValues,
              )}
              onDocumentChange={props.onDocumentChange}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
            />
          )}
        </Show>
        <Show when={deformerNode()}>
          {(node) => (
            <>
              <DeformerInspectorFields
                activeBindingId={props.activeBindingId}
                activeKeyformValues={props.activeKeyformValues}
                disabled={!partProperties.canEditRest()}
                document={props.document}
                editMode={props.editMode}
                node={node()}
                onChange={handleTransformChange}
                onDivisionChange={handleGridDivisionChange}
                onDocumentChange={props.onDocumentChange}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                selectedPoints={props.selectedControlPointIndices}
                targetNodeIds={props.targetNodeIds}
              />
              <DeformerRenderProperties
                disabled={!partProperties.canEditStatic() || props.editMode !== 'parameter'}
                document={props.document}
                keyform={activeKeyform(
                  props.editMode,
                  props.activeBindingId,
                  props.activeKeyformValues,
                )}
                nodeId={node().id}
                onDocumentChange={props.onDocumentChange}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
              />
              <For each={getSelectedControlPointIndices(node(), props.selectedControlPointIndices)}>
                {(pointIndex) => (
                  <DeformerPointProperties
                    curveEditingDisabled={!partProperties.canEditRest()}
                    node={node()}
                    pointEditingDisabled={!partProperties.canEditRest()}
                    pointIndex={pointIndex}
                    onCurveToggle={handleCurveToggle}
                    onEditEnd={props.onEditEnd}
                    onEditStart={props.onEditStart}
                    onPointChange={handleGridPointChange}
                  />
                )}
              </For>
            </>
          )}
        </Show>
        <Show when={props.activeNodeId === undefined}>
          <DocumentProperties
            disabled={props.editingDisabled === true || props.editMode !== 'parameter'}
            document={props.document}
            onDocumentChange={props.onDocumentChange}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
          />
        </Show>
        <Show when={props.notice}>{(message) => <p class="notice">{message()}</p>}</Show>
        {props.children}
        {props.parameterProperties}
      </div>
    </aside>
  )
}
