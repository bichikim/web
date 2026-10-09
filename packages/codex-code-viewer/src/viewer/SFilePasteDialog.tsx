import {createEffect, createSignal, onCleanup} from 'solid-js'
import type {useFileOperations} from './use-file-operations'

interface SFilePasteDialogProps {
  readonly onClose?: () => void
  readonly operations: ReturnType<typeof useFileOperations>
}
export const SFilePasteDialog = (props: SFilePasteDialogProps) => {
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.operations.pasting() && !dialog.open) {
      dialog.showModal()
    } else if (!props.operations.pasting() && dialog.open) {
      dialog.close()
    }
  })
  onCleanup(() => {
    const dialog = element()
    if (dialog?.open) {
      dialog.close()
    }
  })
  return (
    <dialog
      ref={setElement}
      class="ui-entry-dialog"
      aria-busy="true"
      aria-labelledby="paste-entry-title"
      onClose={() => props.onClose?.()}
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="paste-entry-title" class="m-0 text-base font-semibold">
        붙여넣는 중…
      </h2>
      <p autofocus tabindex="0" class="mb-0 mt-3 text-sm text-muted" role="status">
        파일 작업이 끝나면 자동으로 닫힙니다.
      </p>
    </dialog>
  )
}
