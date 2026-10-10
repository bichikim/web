import {createEffect, createSignal, createUniqueId, For, onCleanup} from 'solid-js'
import {SSelect} from './SSelect'
import {SIcon} from './SIcon'
import {MAX_NAVIGATION_PREVIEW_LINES} from '../shared/contracts'

interface SViewerSettingsProps {
  readonly open?: boolean
  readonly previewLines?: number
  readonly onChange?: (lines: number) => void
  readonly onClose?: () => void
}
const lineOptions = Array.from(
  {length: MAX_NAVIGATION_PREVIEW_LINES},
  (_, index) => `${index + 1}줄`,
)
const sample = ['interface User {', '  id: string', '  name: string', '  active: boolean', '}']
export const SViewerSettings = (props: SViewerSettingsProps) => {
  const [element, setElement] = createSignal<HTMLDialogElement | null>(null)
  const title = createUniqueId()
  createEffect(() => {
    const dialog = element()
    if (dialog === null) {
      return
    }
    if (props.open && !dialog.open) {
      dialog.showModal()
    } else if (!props.open && dialog.open) {
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
    props.onClose?.()
  }
  return (
    <dialog
      ref={setElement}
      aria-labelledby={title}
      class="ui-entry-dialog"
      onCancel={cancel}
      onClose={() => props.onClose?.()}
    >
      <div class="flex items-center justify-between gap-4">
        <h2 id={title} class="m-0 text-base font-semibold">
          설정
        </h2>
        <button
          type="button"
          class="ui-icon-button -mr-2"
          aria-label="설정 닫기"
          onClick={() => props.onClose?.()}
        >
          <SIcon name="close" />
        </button>
      </div>
      <p class="mt-1 mb-6 text-sm leading-5 text-muted">
        정의 위치와 사용처 목록의 표시 방식을 설정합니다.
      </p>
      <div class="space-y-2">
        <span class="block text-sm font-medium">미리보기 줄 수</span>
        <SSelect
          label="미리보기 줄 수"
          options={lineOptions}
          value={`${props.previewLines ?? 2}줄`}
          variant="field"
          onChange={(value) => props.onChange?.(Number(value.slice(0, -1)))}
        />
      </div>
      <div class="mt-4 rounded-control border border-divider bg-surface px-3 py-3">
        <span class="mb-2 block text-xs text-muted">미리보기</span>
        <code class="block font-mono text-xs leading-5">
          <For each={sample.slice(0, props.previewLines ?? 2)}>
            {(line, index) => (
              <span class="flex gap-3">
                <span aria-hidden="true" class="w-3 shrink-0 text-right tabular-nums text-muted">
                  {index() + 1}
                </span>
                <span class="whitespace-pre">{line}</span>
              </span>
            )}
          </For>
        </code>
      </div>
      <div class="mt-6 flex justify-end">
        <button type="button" class="ui-button" onClick={() => props.onClose?.()}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
