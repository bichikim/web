import type {PuppetDocument} from '../../player'
import type {ParameterEditorResult} from '../use-parameter-editor'
import {createMemo} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import {getParameterPresentation} from './parameter-presentation'
import {getDocumentParameterBindings, getParameterBindingsForNodeIds} from './parameter-keyforms'
import {EditorKeyformPanel} from './EditorKeyformPanel'
import {EditorPhysicsProperties} from './EditorPhysicsProperties'
interface EditorModelingKeyformPanelProps {
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onPhysicsPreviewChange?: (enabled: boolean) => void
  readonly onPhysicsReset?: () => void
  readonly physicsPreview?: boolean
  readonly selectedNodeIds: ReadonlyArray<string>
}
export const EditorModelingKeyformPanel = (props: EditorModelingKeyformPanelProps) => {
  const bindings = () =>
    props.editor.allParametersVisible()
      ? getDocumentParameterBindings(props.document)
      : getParameterBindingsForNodeIds(props.document, props.selectedNodeIds)
  const presentation = createMemo(() => getParameterPresentation(props.document, bindings()))
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
  const physicsConnectionCount = (parameterIds: ReadonlyArray<string>) =>
    (props.document.physics?.pendulums ?? []).filter((pendulum) =>
      parameterIds.includes(pendulum.inputParameterId),
    ).length
  return (
    <EditorKeyformPanel
      influence={props.editor.influence()}
      onInfluencesChange={props.editor.setInfluences}
      activeBindingId={props.editor.activeBindingId() ?? undefined}
      activeKeyformValues={props.editor.activeKeyformValues()}
      allParametersVisible={props.editor.allParametersVisible()}
      bindings={presentation().bindings}
      parameters={presentation().parameters}
      previewBindingIds={presentation().previewBindingIds}
      getBindingSettingsLabel={(_, parameters) =>
        `물리 ${physicsConnectionCount(parameters.map((parameter) => parameter.id))}`
      }
      parameterCreationAvailable={props.selectedNodeIds.length > 0}
      parameterValueMap={props.editor.parameterValueMap()}
      selectedPartIds={props.selectedNodeIds}
      targetPartIds={props.editor.activeTargetNodeIds()}
      values={displayedValues()}
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
      onValueChange={handleValueChange}
      renderBindingSettings={(_, parameters) => (
        <EditorPhysicsProperties
          inputParameterIds={parameters.map((parameter) => parameter.id)}
          source={props}
        />
      )}
    />
  )
}
