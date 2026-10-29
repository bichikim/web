import {type Accessor, createEffect, untrack} from 'solid-js'
import {EditorState, type Extension, Text} from '@codemirror/state'
import type {EditorView} from '@codemirror/view'

interface UseEditorSourceProps {
  readonly view: Accessor<EditorView | undefined>
  readonly source: Accessor<string>
  readonly extensions: () => Extension
}
/** Replaces state only for externally supplied text, preserving ordinary edit transactions. */
export const useEditorSource = (props: UseEditorSourceProps): void => {
  createEffect(() => {
    const editor = props.view()
    const source = props.source()
    if (editor !== undefined && editor.state.sliceDoc() !== source) {
      editor.setState(
        EditorState.create({
          doc: Text.of(source.split(/\r\n|\r|\n/u)),
          extensions: untrack(props.extensions),
        }),
      )
    }
  })
}
