import {type Accessor, createMemo, onCleanup, untrack} from 'solid-js'
import type {DeletedDocumentView, ViewerPort} from './types'
import type {useViewer} from './use-viewer'
import {useDeletedDocument} from './use-deleted-document'
import {useDocumentSearch} from './use-document-search'
import {useViewerShortcuts} from './use-viewer-shortcuts'
import {hasDocumentSource} from '../shared/has-document-source'
import {readCodeText} from './read-code-text'

interface UseWorkspaceDocumentsProps {
  readonly port: ViewerPort
  readonly viewer: ReturnType<typeof useViewer>
  readonly element: Accessor<HTMLElement | null>
  readonly onSearch: () => void
}

/** Routes document commands to the historical view while retaining the live document and drafts. */
export const useWorkspaceDocuments = (props: UseWorkspaceDocumentsProps) => {
  const viewer = untrack(() => props.viewer)
  const deleted = useDeletedDocument({
    documentPath: () => viewer.session()?.document.location.path,
    editing: viewer.editing,
    onError: viewer.reportError,
    onMove: viewer.move,
    onOpen: viewer.openLocation,
    onRefresh: viewer.refresh,
    port: props.port,
    revision: viewer.workspaceRevision,
    session: viewer.workspaceSession,
  })
  const search = useDocumentSearch({
    source: () => {
      const historical = deleted.document()
      return historical === null
        ? viewer.editing.source()
        : deleted.editable()
          ? `${historical.source ?? ''}\n${deleted.source()}`
          : (historical.source ?? '')
    },
  })
  const sourceAvailable = (): boolean => {
    const historical = deleted.document()
    if (historical !== null) {
      return historical.source !== null
    }
    const document = viewer.session()?.document
    return document === undefined || hasDocumentSource(document)
  }
  const findText = (text?: string): void => {
    if (sourceAvailable()) {
      const container = props.element()?.querySelector<HTMLElement>('[data-code-source]')
      search.open(
        text ??
          (container === null || container === undefined
            ? undefined
            : (readCodeText(container) ?? undefined)),
      )
    }
  }
  const closeSearch = (): void => {
    search.close()
    props
      .element()
      ?.querySelector<HTMLElement>(
        '[role="textbox"][aria-multiline="true"], [data-line-number][tabindex="0"], [data-document-focus]',
      )
      ?.focus({preventScroll: true})
  }
  useViewerShortcuts({
    onDismiss: () => {
      if (search.visible()) {
        closeSearch()
      } else {
        viewer.dismissNotice()
      }
    },
    onFind: findText,
    onMove: deleted.move,
    onSave: () => {
      if (deleted.document() === null) {
        viewer.editing.save()
      } else {
        deleted.save()
      }
    },
    onSearch: props.onSearch,
  })
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('focus', deleted.refresh)
    onCleanup(() => globalThis.removeEventListener('focus', deleted.refresh))
  }
  const deletedView = createMemo<DeletedDocumentView | null>(() => {
    const document = deleted.document()
    if (document === null) {
      return null
    }
    const editable = deleted.editable()
    return {
      document,
      draftSource: deleted.source(),
      editing: deleted.enabled(),
      onChange: editable ? deleted.change : undefined,
      onClose: deleted.close,
      onSave: editable ? deleted.save : undefined,
      onToggleEditing: deleted.toggleEditing,
      pending: deleted.pending(),
      saving: deleted.saving(),
    }
  })
  return {
    ...search,
    address: () => deleted.document()?.path ?? viewer.address(),
    canBack: () => deleted.document() !== null || viewer.canBack(),
    canForward: () => deleted.document() === null && viewer.canForward(),
    closeSearch,
    deletedView,
    findText,
    moveFile: deleted.move,
    openDeleted: (path: string): void => {
      search.close()
      deleted.open(path)
    },
    openLocation: deleted.openLocation,
    refreshFile: deleted.refresh,
    sourceAvailable,
  }
}
