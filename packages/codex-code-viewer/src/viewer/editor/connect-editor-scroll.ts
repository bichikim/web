import type {EditorView} from '@codemirror/view'
import type {FileViewBinding, ScrollPosition} from '../view-state/types'

/** Restores a measured editor viewport and records scroll events through disposal. */
export const connectEditorScroll = (
  editor: EditorView,
  state?: FileViewBinding,
  restored?: ScrollPosition,
): (() => void) => {
  const record = (): void =>
    state?.update({
      codeScroll: {left: editor.scrollDOM.scrollLeft, top: editor.scrollDOM.scrollTop},
    })
  let disposed = false
  if (restored !== undefined) {
    editor.requestMeasure({
      read: () => restored,
      write: (position) => {
        if (!disposed) {
          editor.scrollDOM.scrollTop = position.top
          editor.scrollDOM.scrollLeft = position.left
        }
      },
    })
  }
  editor.scrollDOM.addEventListener('scroll', record)
  return () => {
    disposed = true
    record()
    editor.scrollDOM.removeEventListener('scroll', record)
  }
}
