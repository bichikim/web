import {type Accessor, createMemo} from 'solid-js'

import type {
  ErrorModelDownloadState,
  LoadingModelDownloadState,
  ModelDownloadItem,
  QueuedModelDownloadState,
} from '../../features/model-download'

export interface DownloadStatusItem {
  readonly error: Accessor<ErrorModelDownloadState | null>
  readonly loading: Accessor<LoadingModelDownloadState | null>
  readonly queued: Accessor<QueuedModelDownloadState | null>
}

export const useDownloadStatusItem = (
  item: Accessor<ModelDownloadItem | undefined>,
): DownloadStatusItem => {
  const loading = createMemo(() => {
    const current = item()
    return current?.status === 'loading' ? current : null
  })
  const error = createMemo(() => {
    const current = item()
    return current?.status === 'error' ? current : null
  })
  const queued = createMemo(() => {
    const current = item()
    return current?.status === 'queued' ? current : null
  })
  return {error, loading, queued}
}
