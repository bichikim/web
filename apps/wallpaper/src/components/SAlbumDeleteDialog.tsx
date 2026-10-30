import {createSignal, Show} from 'solid-js'
import {SDialog} from './SDialog'

interface SAlbumDeleteDialogProps {
  readonly name: string
  readonly error?: string | null
  readonly onDelete: () => Promise<void>
  readonly onClose?: () => void
}

/** Confirms deletion of an imported copy and keeps failures available for retry. */
export const SAlbumDeleteDialog = (props: SAlbumDeleteDialogProps) => {
  const [deleting, setDeleting] = createSignal(false)
  const handleClose = () => {
    if (!deleting()) {
      props.onClose?.()
    }
  }
  const handleDelete = async () => {
    if (deleting()) {
      return
    }
    setDeleting(true)
    try {
      await props.onDelete()
      if (props.error === null || props.error === undefined) {
        props.onClose?.()
      }
    } finally {
      setDeleting(false)
    }
  }
  return (
    <SDialog title="앨범에서 삭제" onClose={handleClose}>
      <div class="grid gap-2 p-4">
        <p class="m-0 break-all text-sm font-medium">{props.name}</p>
        <p class="m-0 text-xs text-stone-600">
          앱에 저장된 사본을 삭제합니다. 원본 파일은 유지됩니다.
        </p>
        <Show when={props.error}>
          {(error) => (
            <p role="alert" class="m-0 text-xs text-red-700">
              {error()}
            </p>
          )}
        </Show>
        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="wallpaper-file-button"
            disabled={deleting()}
            onClick={handleClose}
          >
            취소
          </button>
          <button
            type="button"
            class="wallpaper-file-button text-red-700"
            disabled={deleting()}
            onClick={handleDelete}
          >
            삭제
          </button>
        </div>
      </div>
    </SDialog>
  )
}
