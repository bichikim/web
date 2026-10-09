import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import type {useFileRenaming} from './use-file-renaming'

interface SRenameEntryDialogProps {
  readonly onClose?: () => void
  readonly operations: ReturnType<typeof useFileRenaming>
}
export const SRenameEntryDialog = (props: SRenameEntryDialogProps) => {
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  createEffect(() => {
    if (
      props.operations.renaming() !== null &&
      props.operations.renameFeedback() &&
      !props.operations.renamePending()
    ) {
      input()?.focus()
    }
  })
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.operations.renaming() !== null && !dialog.open) {
      dialog.showModal()
      const name = props.operations.renameName()
      const extension = name.lastIndexOf('.')
      input()?.setSelectionRange(
        0,
        props.operations.renaming()?.kind === 'file' && extension > 0 ? extension : name.length,
      )
    } else if (props.operations.renaming() === null && dialog.open) {
      dialog.close()
    }
  })
  onCleanup(() => {
    const dialog = element()
    if (dialog?.open) {
      dialog.close()
    }
  })
  const submit = (event: SubmitEvent): void => {
    event.preventDefault()
    props.operations.confirmRename()
  }
  const cancel = (event: Event): void => {
    event.preventDefault()
    if (!props.operations.renamePending()) {
      props.operations.cancelRename()
    }
  }
  return (
    <dialog
      ref={setElement}
      aria-labelledby="rename-entry-title"
      class="ui-entry-dialog"
      onCancel={cancel}
      onClose={() => props.onClose?.()}
    >
      <form onSubmit={submit}>
        <h2 id="rename-entry-title" class="m-0 text-base font-semibold">
          이름 변경
        </h2>
        <p class="mt-2 break-all text-sm text-muted">위치: {props.operations.renaming()?.path}</p>
        <label class="block text-sm">
          이름
          <input
            ref={setInput}
            autofocus
            aria-label="이름"
            class="ui-field mt-2 block h-9 w-full px-3 text-sm outline-none"
            disabled={props.operations.renamePending()}
            value={props.operations.renameName()}
            onInput={(event) => props.operations.changeRename(event.currentTarget.value)}
            required
            maxLength={255}
          />
        </label>
        <Show when={props.operations.renaming() !== null && props.operations.renameFeedback()}>
          <p role="alert" class="mt-2 text-sm text-foreground">
            {props.operations.renameFeedback()}
          </p>
        </Show>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="ui-button"
            disabled={props.operations.renamePending()}
            onClick={() => props.operations.cancelRename()}
          >
            취소
          </button>
          <button
            type="submit"
            class="ui-primary"
            disabled={
              props.operations.renamePending() || props.operations.renameName().trim() === ''
            }
          >
            {props.operations.renamePending() ? '변경 중…' : '변경'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
