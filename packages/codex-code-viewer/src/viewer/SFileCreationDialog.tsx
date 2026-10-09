import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import type {useFileCreation} from './use-file-creation'

interface SFileCreationDialogProps {
  readonly creation: ReturnType<typeof useFileCreation>
}
export const SFileCreationDialog = (props: SFileCreationDialogProps) => {
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  createEffect(() => {
    if (props.creation.feedback() && !props.creation.pending()) {
      input()?.focus()
    }
  })
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.creation.context() !== null && !dialog.open) {
      dialog.showModal()
    } else if (props.creation.context() === null && dialog.open) {
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
    props.creation.submit()
  }
  const cancel = (event: Event): void => {
    event.preventDefault()
    if (!props.creation.pending()) {
      props.creation.cancel()
    }
  }
  return (
    <dialog
      ref={setElement}
      aria-labelledby="create-entry-title"
      class="ui-entry-dialog"
      onCancel={cancel}
    >
      <form onSubmit={submit}>
        <h2 id="create-entry-title" class="m-0 text-base font-semibold">
          {props.creation.context()?.kind === 'directory' ? '새 폴더' : '새 파일'}
        </h2>
        <p class="mt-2 break-all text-sm text-muted">
          위치: {props.creation.context()?.parent || '작업 폴더'}
        </p>
        <label class="block text-sm">
          이름
          <input
            ref={setInput}
            autofocus
            aria-label="이름"
            class="ui-field mt-2 block h-9 w-full px-3 text-sm outline-none"
            disabled={props.creation.pending()}
            value={props.creation.name()}
            onInput={(event) => props.creation.change(event.currentTarget.value)}
            required
            maxLength={255}
          />
        </label>
        <Show when={props.creation.feedback()}>
          <p role="alert" class="mt-2 text-sm text-foreground">
            {props.creation.feedback()}
          </p>
        </Show>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="ui-button"
            disabled={props.creation.pending()}
            onClick={() => props.creation.cancel()}
          >
            취소
          </button>
          <button
            type="submit"
            class="ui-primary"
            disabled={props.creation.pending() || props.creation.name().trim() === ''}
          >
            {props.creation.pending() ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
