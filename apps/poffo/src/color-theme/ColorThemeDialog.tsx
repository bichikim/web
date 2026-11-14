import {createSignal, createUniqueId, onCleanup, onMount, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {EditorButton, useEditorPortalMount} from '@winter-love/puppet/editor'
import {ColorThemeFields} from './ColorThemeFields'
import {useColorTheme} from './use-color-theme'
import {createFocusScope} from '@kobalte/core/primitives/create-focus-scope'

interface ColorThemeDialogProps {
  /** Ends the settings session; the owner unmounts this dialog. */
  readonly onClose: () => void
  /** Restores the menu trigger's focus after disposal; omitted for native focus restoration. */
  readonly onReturnFocus?: () => void
}

export const ColorThemeDialog = (props: ColorThemeDialogProps) => {
  const mount = useEditorPortalMount()
  const theme = useColorTheme(document.documentElement)
  const titleId = createUniqueId()
  const [dialog, setDialog] = createSignal<HTMLDialogElement>()
  createFocusScope({trapFocus: true}, dialog)
  onMount(() => dialog()?.showModal())
  onCleanup(() => {
    dialog()?.close()
    props.onReturnFocus?.()
  })
  const handleClose = () => props.onClose()
  const handleCancel = (event: Event) => {
    event.preventDefault()
    handleClose()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === 'Escape' &&
      !event.defaultPrevented &&
      dialog()?.querySelector('[popover]:popover-open') === null
    ) {
      event.preventDefault()
      event.stopPropagation()
      handleClose()
    }
  }
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (theme.apply()) {
      handleClose()
    }
  }
  return (
    <Portal mount={mount}>
      <div class="puppet-editor color-theme-scope">
        <dialog
          ref={setDialog}
          class="color-theme-dialog"
          aria-labelledby={titleId}
          onCancel={handleCancel}
          onKeyDown={handleKeyDown}
        >
          <form onSubmit={handleSubmit}>
            <header>
              <h2 id={titleId}>색 테마</h2>
              <EditorButton aria-label="색 테마 닫기" onClick={handleClose}>
                <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
              </EditorButton>
            </header>
            <ColorThemeFields theme={theme} />
            <div class="color-theme-status-preview" role="group" aria-label="상태색 미리보기">
              <span class="auto-mesh-error">오류</span>
              <span class="auto-mesh-warning">경고</span>
            </div>
            <details>
              <summary>세부 색상</summary>
              <ColorThemeFields advanced theme={theme} />
            </details>
            <Show when={theme.lowContrast()}>
              <p class="auto-mesh-warning" role="status">
                글자와 배경의 대비가 낮습니다.
              </p>
            </Show>
            <Show when={theme.error()}>
              {(message) => (
                <p class="auto-mesh-error" role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <footer>
              <EditorButton class="secondary" onClick={theme.reset}>
                기본값 복원
              </EditorButton>
              <div>
                <EditorButton class="secondary" onClick={handleClose}>
                  취소
                </EditorButton>
                <EditorButton class="primary" type="submit">
                  적용
                </EditorButton>
              </div>
            </footer>
          </form>
        </dialog>
      </div>
    </Portal>
  )
}
