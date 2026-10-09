import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import type {useFileOperations} from './use-file-operations'

interface SDeleteEntryDialogProps {
  readonly operations: ReturnType<typeof useFileOperations>
  readonly onClose?: () => void
}
export const SDeleteEntryDialog = (props: SDeleteEntryDialogProps) => {
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.operations.deleting() !== null && !dialog.open) {
      dialog.showModal()
    } else if (props.operations.deleting() === null && dialog.open) {
      dialog.close()
    }
  })
  onCleanup(() => {
    const dialog = element()
    if (dialog?.open) {
      dialog.close()
    }
  })
  const cancel = (event: Event): void => {
    event.preventDefault()
    props.operations.cancelDelete()
  }
  return (
    <dialog
      ref={setElement}
      aria-labelledby="delete-entry-title"
      class="ui-entry-dialog"
      onCancel={cancel}
      onClose={() => props.onClose?.()}
    >
      <h2 id="delete-entry-title" class="m-0 text-base font-semibold">
        {props.operations.deleting()?.kind === 'directory' ? '폴더 삭제' : '파일 삭제'}
      </h2>
      <p class="mt-3 break-all text-sm font-medium">{props.operations.deleting()?.path}</p>
      <p class="text-sm leading-6 text-muted">
        {props.operations.deleting()?.kind === 'directory'
          ? '폴더와 그 안의 모든 항목을'
          : '이 파일을'}{' '}
        휴지통을 거치지 않고 삭제합니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      <Show when={props.operations.deleting() !== null && props.operations.feedback()}>
        <p class="text-sm text-foreground" role="alert">
          {props.operations.feedback()}
        </p>
      </Show>
      <div class="mt-5 flex justify-end gap-2">
        <button
          autofocus
          class="ui-button"
          disabled={props.operations.pending()}
          onClick={() => props.operations.cancelDelete()}
          type="button"
        >
          취소
        </button>
        <button
          class="ui-primary"
          disabled={props.operations.pending()}
          onClick={() => props.operations.confirmDelete()}
          type="button"
        >
          {props.operations.pending() ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </dialog>
  )
}
