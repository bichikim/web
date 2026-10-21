import {Show} from 'solid-js'
import {isThreeDimensionalParameterBinding} from '../../deformation'
import type {PuppetParameterBinding3D} from '../../player/document'
import {EditorKeyformFlatTrack} from './EditorKeyformFlatTrack'
import {EditorKeyformVolumeTrack} from './EditorKeyformVolumeTrack'
import type {EditorKeyformTrackProps} from './keyform-track'

export type {EditorKeyformTrackProps} from './keyform-track'

export const EditorKeyformTrack = (props: EditorKeyformTrackProps) => (
  <Show
    when={isThreeDimensionalParameterBinding(props.binding)}
    fallback={<EditorKeyformFlatTrack {...props} />}
  >
    <EditorKeyformVolumeTrack {...props} binding={props.binding as PuppetParameterBinding3D} />
  </Show>
)
