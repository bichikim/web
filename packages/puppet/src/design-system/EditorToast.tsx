import {Show} from 'solid-js'
import type {EditorToastProps} from './editor-toast/types'
import {EditorToastSurface} from './editor-toast/EditorToastSurface'

export const EditorToast = (props: EditorToastProps) => (
  <Show when={props.message}>
    <EditorToastSurface message={props.message} onDismiss={props.onDismiss} tone={props.tone} />
  </Show>
)
