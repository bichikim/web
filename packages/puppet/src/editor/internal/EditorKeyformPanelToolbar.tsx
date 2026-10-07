import type {Accessor} from 'solid-js'
import type {PuppetParameterBinding} from '../../player'
import type {EditorKeyformPanelProps} from './editor-keyform-panel-props'
import {EditorKeyformToolbar} from './EditorKeyformToolbar'

interface EditorKeyformPanelToolbarProps {
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly activePreview: Accessor<boolean>
  readonly source: EditorKeyformPanelProps
  readonly titleId: string
}

export const EditorKeyformPanelToolbar = (props: EditorKeyformPanelToolbarProps) => (
  <EditorKeyformToolbar
    center={props.source.keyformCenter}
    parameters={props.activeBinding()?.parameterIds.flatMap((id) => {
      const parameter = props.source.parameters.find((entry) => entry.id === id)
      return parameter === undefined ? [] : [parameter]
    })}
    onMirror={props.activePreview() ? undefined : props.source.onKeyformMirror}
    onGenerate={props.activePreview() ? undefined : props.source.onCornersGenerate}
    activeBinding={props.activeBinding()}
    activeKeyformValues={props.source.activeKeyformValues}
    onKeyformAdd={props.activePreview() ? undefined : props.source.onKeyformAdd}
    onKeyformDelete={props.activePreview() ? undefined : props.source.onKeyformDelete}
    onParameterAdd={props.source.onParameterAdd}
    onTwoDimensionalParameterAdd={props.source.onTwoDimensionalParameterAdd}
    parameterCreationAvailable={props.source.parameterCreationAvailable}
    setBrushControlsMount={props.source.setBrushControlsMount}
    titleId={props.titleId}
  />
)
