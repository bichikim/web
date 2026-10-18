import {EditorButton} from '../../design-system'
import {onCleanup, Show} from 'solid-js'

import type {PuppetParameterValues} from '../../deformation'
import type {PuppetParameterBinding} from '../../player/document'
import {EditorKeyformTools, type EditorKeyformToolsProps} from './EditorKeyformTools'

export interface EditorKeyformToolbarProps extends Pick<
  EditorKeyformToolsProps,
  'center' | 'parameters' | 'onMirror' | 'onGenerate'
> {
  readonly activeBinding?: PuppetParameterBinding
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly onParameterAdd?: () => void
  readonly onTwoDimensionalParameterAdd?: () => void
  readonly parameterCreationAvailable?: boolean
  readonly setBrushControlsMount?: (element: HTMLDivElement | undefined) => void
  readonly titleId: string
}

const BrushControlsMount = (props: {
  readonly setMount: (element: HTMLDivElement | undefined) => void
}) => {
  onCleanup(() => props.setMount(undefined))
  return <div class="keyform-brush-mount" ref={props.setMount} />
}

export const EditorKeyformToolbar = (props: EditorKeyformToolbarProps) => {
  return (
    <header class="keyform-toolbar">
      <div class="keyform-parameter-heading" id={props.titleId} aria-label="Parameters">
        <EditorButton
          aria-label="1차원 Parameter 추가"
          class="panel-add-button"
          disabled={
            props.parameterCreationAvailable === false || props.onParameterAdd === undefined
          }
          type="button"
          onClick={() => props.onParameterAdd?.()}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" /> 1D
        </EditorButton>
        <EditorButton
          aria-label="2차원 Parameter 추가"
          class="panel-add-button"
          disabled={
            props.parameterCreationAvailable === false ||
            props.onTwoDimensionalParameterAdd === undefined
          }
          type="button"
          onClick={() => props.onTwoDimensionalParameterAdd?.()}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" /> 2D
        </EditorButton>
      </div>
      <div class="keyform-actions">
        <Show when={props.onMirror !== undefined || props.onGenerate !== undefined}>
          <EditorKeyformTools
            binding={props.activeBinding}
            values={props.activeKeyformValues}
            parameters={props.parameters}
            center={props.center}
            onMirror={props.onMirror}
            onGenerate={props.onGenerate}
          />
        </Show>
        <Show when={props.setBrushControlsMount}>
          {(setMount) => <BrushControlsMount setMount={setMount()} />}
        </Show>
      </div>
    </header>
  )
}
