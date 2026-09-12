import {createMemo, createSignal, Show} from 'solid-js'
import type {PFeedController} from 'src/features/focus-room-feed'
import {useModelDownload} from 'src/features/model-download'
import * as m from '@paraglide/message'
import {FeedGenerationStatus} from '../feed-status/FeedGenerationStatus'

interface PFeedProgressProps {
  readonly controller: PFeedController
}

export const PFeedProgress = (props: PFeedProgressProps) => {
  const download = useModelDownload()
  const [stopping, setStopping] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const activeDownload = createMemo(() => {
    const state = download.state()
    if (state.status !== 'loading' || state.target.kind !== 'voice') {
      return null
    }
    return props.controller.recoveryJobs().some((job) => job.modelId === state.target.modelId)
      ? state
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
    const state = props.controller.state()
    return state.status === 'preparing' || state.status === 'generating'
      ? {message: state.message, progress: state.progress, status: state.status}
      : null
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
      await props.controller.cancelProcessing()
    } catch {
      setError(m.feed_stop_failed())
    } finally {
      setStopping(false)
    }
  }
  return (
    <>
      <Show when={progress()}>
        {(state) => (
          <div class="border-t border-solid border-border pt-4">
            <FeedGenerationStatus
              respectVisibilityPreference={false}
              cancelDisabled={stopping()}
              onCancel={handleStop}
              state={state().status}
              message={
                <>
                  {stopping() ? m.feed_stopping() : state().message}
                  <Show when={state().progress !== null}> · {state().progress}%</Show>
                </>
              }
            />
          </div>
        )}
      </Show>
      <Show when={error()}>
        {(message) => (
          <p class="m-0 text-sm text-danger" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </>
  )
}
