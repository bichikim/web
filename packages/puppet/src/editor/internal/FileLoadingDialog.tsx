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
        <Dialog.Content class="auto-mesh-dialog-content">
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
