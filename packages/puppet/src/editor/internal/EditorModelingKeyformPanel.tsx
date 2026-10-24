import type {PuppetDocument} from '../../player'
import {getMirrorAxisReferences} from './mirror-axis-references'
import type {ParameterEditorResult} from '../use-parameter-editor'
import {createMemo} from 'solid-js'
import {getBindingInfluence, type PuppetParameterValues} from '../../deformation'
import {getParameterPresentation} from './parameter-presentation'
import {getDocumentParameterBindings, getParameterBindingsForNodeIds} from './parameter-keyforms'
import {EditorKeyformPanel} from './EditorKeyformPanel'
interface EditorModelingKeyformPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly selectedNodeIds: ReadonlyArray<string>
  readonly setBrushControlsMount?: (element: HTMLDivElement | undefined) => void
}
export const EditorModelingKeyformPanel = (props: EditorModelingKeyformPanelProps) => {
  const bindings = () => {
    const allBindings = getDocumentParameterBindings(props.document)
    if (props.editor.allParametersVisible()) {
      return allBindings
    }
    const selectedIds = new Set(props.selectedNodeIds)
    const linkedIds = new Set(
      (props.document.layerOrderRules ?? [])
        .filter(
          (rule) =>
            rule.partIds.some((id) => selectedIds.has(id)) || selectedIds.has(rule.referencePartId),
        )
        .flatMap((rule) => rule.when.parameterIds),
    )
    const deformationIds = new Set(
      getParameterBindingsForNodeIds(props.document, props.selectedNodeIds).map(
        (binding) => binding.id,
      ),
    )
    return allBindings.filter(
      (binding) =>
        deformationIds.has(binding.id) || binding.parameterIds.some((id) => linkedIds.has(id)),
    )
  }
  const presentation = createMemo(() => getParameterPresentation(props.document, bindings()))
  const bindingInfluences = createMemo(() => {
    const document = props.editor.previewDocument()
    const parameterValues = props.editor.parameterValueMap()
    return new Map(
      getDocumentParameterBindings(document).map((binding) => [
        binding.id,
        getBindingInfluence({binding, document, parameterValues}),
      ]),
    )
  })
  const handleValueChange = (values: PuppetParameterValues) => {
    const bindingId = props.editor.activeBindingId()
    if (bindingId === null) {
      return
    }
    const expanded = presentation().expandValues(
      bindingId,
      values,
      props.editor.parameterValueMap(),
    )
    if (expanded !== undefined) {
      props.editor.setParameterValues(expanded)
    }
  }
  const displayedValues = () =>
    presentation().projectValues(
      props.editor.activeBindingId() ?? '',
      props.editor.parameterValues(),
    )
  return (
    <EditorKeyformPanel
      keyformCenters={getMirrorAxisReferences(props.document)}
      onKeyformMirror={props.editor.mirrorKeyform}
      onCornersGenerate={props.editor.generateCorners}
      setBrushControlsMount={props.setBrushControlsMount}
      bindingInfluences={bindingInfluences()}
      selectedBindingId={
        props.editor.selectedBindingId?.() ?? props.editor.activeBindingId() ?? undefined
      }
      activeBindingId={props.editor.activeBindingId() ?? undefined}
      activeKeyformValues={props.editor.activeKeyformValues()}
      allParametersVisible={props.editor.allParametersVisible()}
      bindings={presentation().bindings}
      parameters={presentation().parameters}
      previewBindingIds={presentation().previewBindingIds}
      parameterCreationAvailable={props.selectedNodeIds.length > 0}
      parameterValueMap={props.editor.parameterValueMap()}
      selectedPartIds={props.selectedNodeIds}
      targetPartIds={props.editor.activeTargetNodeIds()}
      values={displayedValues()}
      onEditEnd={props.onEditEnd}
      onEditStart={props.onEditStart}
      onKeyformAdd={props.editor.addKeyform}
      onKeyformDelete={props.editor.deleteKeyform}
      onKeyformPlaneDelete={(bindingId, value) => {
        props.editor.selectBinding(bindingId)
        props.editor.deleteKeyformPlane(value)
      }}
      onKeyformMove={(bindingId, values, nextValues) => {
        props.editor.selectBinding(bindingId)
        props.editor.moveKeyform(values, nextValues)
      }}
      onKeyformSelect={(bindingId, values) => {
        props.editor.selectBinding(bindingId)
        props.editor.selectKeyform(values)
      }}
      onBindingDelete={props.editor.deleteParameter}
      onBindingActivate={props.editor.selectBinding}
      onBindingSelect={props.editor.requestBinding ?? props.editor.selectBinding}
      onParameterAdd={props.editor.addParameter}
      onParameterNameChange={(bindingId, parameterId, name) => {
        props.editor.selectBinding(bindingId)
        props.editor.renameParameter(parameterId, name)
      }}
      onSelectionConnect={props.editor.connectSelection}
      onSelectionDisconnect={props.editor.disconnectSelection}
      onAllParametersVisibleChange={props.editor.setAllParametersVisible}
      onThreeDimensionalParameterAdd={props.editor.addThreeDimensionalParameter}
      onTwoDimensionalParameterAdd={props.editor.addTwoDimensionalParameter}
      onValueChange={handleValueChange}
    />
  )
}
