import {EditorToast} from '@winter-love/puppet/editor'
import type {useDocumentExport} from './use-document-export'

interface DocumentNoticeProps {
  readonly exporting: ReturnType<typeof useDocumentExport>
  /** Current editor notice; omitted to show export feedback. */
  readonly message?: string | null
  /** Clears the editor notice when dismissed; omitted for export feedback alone. */
  readonly onDismiss?: () => void
}

/** Presents editor notices before export feedback and acknowledges both on dismissal. */
export const DocumentNotice = (props: DocumentNoticeProps) => {
  const handleDismiss = () => {
    props.onDismiss?.()
    props.exporting.dismissNotice()
  }
  return (
    <EditorToast
      message={
        props.message ??
        props.exporting.notice() ??
        (props.exporting.omitsTemporary()
          ? '내보낸 문서에는 임시 변경이 포함되지 않았습니다.'
          : undefined)
      }
      onDismiss={handleDismiss}
    />
  )
}
