import {batch, createSignal, onCleanup, onMount} from 'solid-js'
import type {PuppetDocument} from '../player'
import type {DocumentRecovery, DocumentRecoveryEntry} from './document-recovery'

interface UseDocumentRecoveryProps {
  readonly recovery: DocumentRecovery
  readonly onRestore: (document: PuppetDocument) => void
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
      props.onRestore(document)
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
