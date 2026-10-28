import {Dialog} from '@kobalte/core/dialog'
import {useEditorPortalMount} from '../../design-system'

interface FileLoadingDialogProps {
  /** File being read. Omitted or null, keep the dialog closed. */
  readonly fileName?: string | null
  /** Cancels the pending read without changing the document. */
  readonly onCancel: () => void
}

export const FileLoadingDialog = (props: FileLoadingDialogProps) => {
  const mount = useEditorPortalMount()
  // File actions open this dialog without a Dialog.Trigger.
  let returnFocus: Element | null = null
  const handleOpenAutoFocus = (event: Event) => {
    const content = event.target
    if (content instanceof HTMLElement) {
      const root = content.getRootNode()
      returnFocus =
        root instanceof ShadowRoot ? root.activeElement : content.ownerDocument.activeElement
    }
  }
  const handleCloseAutoFocus = (event: Event) => {
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      event.preventDefault()
      returnFocus.focus()
    }
    returnFocus = null
  }
  // Retained popovers can consume document-level Escape before the loading dialog.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      props.onCancel()
    }
  }
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      props.onCancel()
    }
  }
  return (
    <Dialog
      open={props.fileName !== undefined && props.fileName !== null}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Portal mount={mount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content
          class="auto-mesh-dialog-content"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={handleOpenAutoFocus}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <form onSubmit={(event) => event.preventDefault()}>
            <header>
              <div>
                <Dialog.Title role="status">불러오는 중…</Dialog.Title>
                <Dialog.Description>{props.fileName}</Dialog.Description>
              </div>
            </header>
            <footer>
              <Dialog.CloseButton class="secondary" aria-label="취소">
                취소
              </Dialog.CloseButton>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
