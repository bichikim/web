import {PinEditor} from './PinEditor'
import type {DeformerEditMode} from './DeformerMode'
import {BoneEditor} from './BoneEditor'
import {SpatialDeformerEditor} from './SpatialDeformerEditor'
import {createSignal, Show} from 'solid-js'
import type {PuppetSceneDeformerNode} from '../../player'
import type {DeformerEditorProps} from './deformer-editor/types'
import {getSelectedDeformer} from './deformer-editor/get-selected-deformer'
import {DeformerSurfaceEditor} from './deformer-editor/DeformerSurfaceEditor'

export interface SelectedDeformerProps extends DeformerEditorProps {
  readonly node: PuppetSceneDeformerNode
}

export const DeformerEditor = (props: DeformerEditorProps) => {
  const [localMode, setLocalMode] = createSignal<DeformerEditMode>('pose')
  const mode = () => props.deformerMode ?? localMode()
  const changeMode = (value: DeformerEditMode) => {
    setLocalMode(value)
    props.onDeformerModeChange?.(value)
  }
  const node = () =>
    getSelectedDeformer(props.previewDocument ?? props.document, props.activeNodeId)
  return (
    <Show
      when={node()?.deformerType === 'spatial'}
      fallback={
        <Show
          when={node()?.pins !== undefined}
          fallback={
            <Show
              when={node()?.boneRestPoints !== undefined}
              fallback={
                <DeformerSurfaceEditor
                  {...props}
                  deformerMode={mode()}
                  onDeformerModeChange={changeMode}
                />
              }
            >
              <BoneEditor
                {...props}
                node={node()!}
                deformerMode={mode()}
                onDeformerModeChange={changeMode}
              />
            </Show>
          }
        >
          <PinEditor
            {...props}
            node={node()!}
            deformerMode={mode()}
            onDeformerModeChange={changeMode}
          />
        </Show>
      }
    >
      <SpatialDeformerEditor {...props} node={node()!} />
    </Show>
  )
}

export type {DeformerEditorProps} from './deformer-editor/types'
