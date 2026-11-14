import {type Accessor, batch, createSignal, onCleanup, onMount} from 'solid-js'
import type {ModelCommandResult} from './model'
import type {PuppetDocument} from '../player'
import type {DocumentRecovery, DocumentRecoveryEntry} from './document-recovery'

interface UseDocumentRecoveryProps {
  /** Storage owned by the host; the hook does not dispose it. */
  readonly recovery: DocumentRecovery
  /** Current host revision. Omitted, the host is responsible for detecting source changes. */
  readonly revision?: Accessor<number>
  /** Submits the recovered model; only a completed host commit closes the dialog. */
  readonly onRestore: (document: PuppetDocument) => ModelCommandResult
  /** Closes the UI after successful host application, never after rejection. */
  readonly onClose: () => void
}

export const useDocumentRecovery = (props: UseDocumentRecoveryProps) => {
  const [entries, setEntries] = createSignal<ReadonlyArray<DocumentRecoveryEntry>>([])
  const [loading, setLoading] = createSignal(true)
  const [restoring, setRestoring] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const refresh = async () => {
    batch(() => {
      setLoading(true)
      setError(null)
    })
    try {
      const entries = await props.recovery.listRecoveries()
      if (!disposed) {
        setEntries(entries)
      }
    } catch {
      if (!disposed) {
        setError('저장된 작업 목록을 불러오지 못했습니다.')
      }
    } finally {
      if (!disposed) {
        setLoading(false)
      }
    }
  }
  onMount(refresh)
  const restore = async (id: string) => {
    if (restoring() || disposed) {
      return
    }
    const revision = props.revision?.()
    batch(() => {
      setRestoring(true)
      setError(null)
    })
    try {
      const document = await props.recovery.loadRecovery(id)
      if (disposed) {
        return
      }
      if (document === null) {
        setError('저장된 작업을 찾을 수 없습니다.')
        return
      }
      if (revision !== props.revision?.()) {
        setError('문서가 변경되었습니다. 복구할 작업을 다시 선택하세요.')
        return
      }
      const result = props.onRestore(document)
      if (!result.ok) {
        setError('진행 중인 편집을 마친 후 다시 복구하세요.')
        return
      }
      props.onClose()
    } catch {
      if (!disposed) {
        setError('작업을 복구하지 못했습니다. 다시 시도하세요.')
      }
    } finally {
      if (!disposed) {
        setRestoring(false)
      }
    }
  }
  return {entries, error, loading, refresh, restore, restoring}
}
