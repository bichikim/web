import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {PFeedController} from 'src/features/focus-room-feed'
import type {useModelDownload} from 'src/features/model-download'
import * as m from '@paraglide/message'

export const useFeedProgress = (
  controller: Accessor<PFeedController>,
  download: ReturnType<typeof useModelDownload>,
) => {
  const [stopping, setStopping] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const activeDownload = createMemo(() => {
    const state = download.state()
    if (state.status !== 'loading' || state.target.kind !== 'voice') {
      return null
    }
    return controller()
      .recoveryJobs()
      .some((job) => job.modelId === state.target.modelId)
      ? state
      : null
  })
  const generation = createMemo(() => {
    const state = controller().state()
    return state.status === 'preparing' || state.status === 'generating'
      ? {message: state.message, progress: state.progress, status: state.status}
      : null
  })
  const progress = createMemo(() => {
    const loading = activeDownload()
    if (loading !== null) {
      return {
        message: m.feed_downloading_model({label: loading.label, percentage: loading.percentage}),
        progress: null,
        status: 'preparing' as const,
      }
    }
    return generation()
  })
  const handleStop = async () => {
    if (stopping()) {
      return
    }
    setStopping(true)
    setError(null)
    try {
      if (activeDownload() !== null) {
        download.cancel()
      }
      await controller().cancelProcessing()
    } catch (failure: unknown) {
      console.error('Failed to cancel feed processing.', failure)
      setError(m.feed_stop_failed())
    } finally {
      setStopping(false)
    }
  }
  return {activeDownload, error, generation, handleStop, progress, stopping}
}
