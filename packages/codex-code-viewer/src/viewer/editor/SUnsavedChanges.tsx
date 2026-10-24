import {useLocalizedMessage} from '../locale/use-localized-message'
import {useTranslations} from '../locale/use-translations'
import {createEffect, createSignal, For, onCleanup} from 'solid-js'
import type {useCodeEditing} from '../use-code-editing'

interface SUnsavedChangesProps {
  readonly editing: ReturnType<typeof useCodeEditing>
}
export const SUnsavedChanges = (props: SUnsavedChangesProps) => {
  const t = useTranslations()
  const localize = useLocalizedMessage()
  const [element, setElement] = createSignal<HTMLDialogElement>()
  createEffect(() => {
    const dialog = element()
    if (dialog === undefined) {
      return
    }
    if (props.editing.confirming()) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
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
      aria-labelledby="unsaved-title"
      class="ui-unsaved-dialog"
      onCancel={(event) => {
        event.preventDefault()
        props.editing.resolveLeave('cancel')
      }}
    >
      <h2 id="unsaved-title" class="m-0 text-base font-semibold">
        {t('미저장 변경이 있습니다')}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {t('작업 폴더를 바꾸거나 닫기 전에 변경을 저장하세요.')}
      </p>
      <ul class="max-h-48 overflow-auto pl-5 text-sm">
        <For each={props.editing.pendingFiles()}>
          {(path) => <li class="break-all py-1">{path}</li>}
        </For>
      </ul>
      <p role="status" class="text-sm text-muted">
        {localize(props.editing.feedback() ?? '')}
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="ui-button"
          disabled={props.editing.saving()}
          onClick={() => props.editing.resolveLeave('cancel')}
        >
          {t('계속 편집')}
        </button>
        <button
          type="button"
          class="ui-button"
          disabled={props.editing.saving()}
          onClick={() => props.editing.resolveLeave('discard')}
        >
          {t('변경 버리기')}
        </button>
        <button
          type="button"
          class="ui-primary"
          disabled={props.editing.saving()}
          onClick={() => props.editing.resolveLeave('save')}
        >
          {props.editing.saving() ? t('저장 중…') : t('모두 저장')}
        </button>
      </div>
    </dialog>
  )
}
