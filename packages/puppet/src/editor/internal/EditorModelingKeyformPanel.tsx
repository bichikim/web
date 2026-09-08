import type {PuppetDocument} from '../../player'
import type {ParameterEditorResult} from '../use-parameter-editor'
import {
  getDocumentParameterBindings,
  getDocumentParameters,
  getParameterBindingsForNodeIds,
} from './parameter-keyforms'
import {EditorKeyformPanel} from './EditorKeyformPanel'
interface EditorModelingKeyformPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly selectedNodeIds: ReadonlyArray<string>
}
export const EditorModelingKeyformPanel = (props: EditorModelingKeyformPanelProps) => {
  const bindings = () =>
    props.editor.allParametersVisible()
      ? getDocumentParameterBindings(props.document)
      : getParameterBindingsForNodeIds(props.document, props.selectedNodeIds)
  return (
    <EditorKeyformPanel
      influence={props.editor.influence()}
      onInfluencesChange={props.editor.setInfluences}
      activeBindingId={props.editor.activeBindingId() ?? undefined}
      activeKeyformValues={props.editor.activeKeyformValues()}
      allParametersVisible={props.editor.allParametersVisible()}
      bindings={bindings()}
      parameters={getDocumentParameters(props.document)}
      parameterCreationAvailable={props.selectedNodeIds.length > 0}
      parameterValueMap={props.editor.parameterValueMap()}
      selectedPartIds={props.selectedNodeIds}
      targetPartIds={props.editor.activeTargetNodeIds()}
      values={props.editor.parameterValues()}
      onEditEnd={props.onEditEnd}
      onEditStart={props.onEditStart}
      onKeyformAdd={props.editor.addKeyform}
      onKeyformDelete={props.editor.deleteKeyform}
      onKeyformMove={(bindingId, values, nextValues) => {
        props.editor.selectBinding(bindingId)
        props.editor.moveKeyform(values, nextValues)
      }}
      onKeyformSelect={(bindingId, values) => {
        props.editor.selectBinding(bindingId)
        props.editor.selectKeyform(values)
      }}
      onBindingDelete={props.editor.deleteParameter}
      onBindingSelect={props.editor.selectBinding}
      onParameterAdd={props.editor.addParameter}
      onParameterNameChange={(bindingId, parameterId, name) => {
        props.editor.selectBinding(bindingId)
        props.editor.renameParameter(parameterId, name)
      }}
      onSelectionConnect={props.editor.connectSelection}
      onSelectionDisconnect={props.editor.disconnectSelection}
      onAllParametersVisibleChange={props.editor.setAllParametersVisible}
      onTwoDimensionalParameterAdd={props.editor.addTwoDimensionalParameter}
      onValueChange={props.editor.setParameterValues}
    />
  )
}
