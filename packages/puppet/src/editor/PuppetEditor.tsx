import {createRoot, createSignal, onCleanup, onMount, Show} from 'solid-js'
import type {PuppetEditorProps} from './types'
import type {EditorController} from './control'
import {EditorBody} from './internal/EditorBody'

export type {PuppetEditorProps} from './types'

/** Mounts one editor instance; disposing its control releases all instance-owned resources. */
export const PuppetEditor = (props: PuppetEditorProps) => {
  const [disposed, setDisposed] = createSignal(false)
  let control: EditorController | undefined
  let disposeBody: (() => void) | undefined
  onCleanup(() => {
    control?.lifecycle.dispose()
    disposeBody?.()
  })
  // Release the host gesture before field cleanup can finish it as a committed edit.
  const content = createRoot((dispose) => {
    disposeBody = dispose
    return (
      <EditorBody
        {...props}
        onControl={(next) => {
          control = next
        }}
        onDispose={() => {
          setDisposed(true)
          dispose()
        }}
      />
    )
  })
  onMount(() => {
    if (control !== undefined) {
      props.onControl?.(control)
    }
  })
  return <Show when={!disposed()}>{content}</Show>
}
