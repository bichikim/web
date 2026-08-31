import {cx} from 'class-variance-authority'
import {Match, Switch} from 'solid-js'

import {
  type ErrorModelDownloadState,
  type LoadingModelDownloadState,
  useModelDownload,
} from '../features/model-download'
import {PLoadingStatus} from './PLoadingStatus'

const ERROR_CLASSES = cx(
  'pointer-events-auto flex min-h-control-sm items-center gap-2',
  'border border-solid border-border rounded-control bg-surface px-3',
  'text-foreground text-xs font-650 shadow-panel backdrop-blur-surface',
)
const DISMISS_CLASSES = cx(
  'ml-1 min-h-7 cursor-pointer border-0 rounded-control bg-secondary-soft px-2.5',
  'text-foreground text-xs font-750 outline-none',
  'hover:bg-[rgb(114_123_96_/_30%)] focus-visible:shadow-focus',
)

export const PModelDownloadStatus = () => {
  const download = useModelDownload()
  const loadingState = (): LoadingModelDownloadState | null => {
    const currentState = download.state()
    return currentState.status === 'loading' ? currentState : null
  }
  const errorState = (): ErrorModelDownloadState | null => {
    const currentState = download.state()
    return currentState.status === 'error' ? currentState : null
  }

  return (
    <Switch>
      <Match when={loadingState()}>
        {(state) => (
          <div aria-live="polite" class="pointer-events-auto" role="status">
            <div class="border border-solid border-border rounded-control backdrop-blur-surface">
              <PLoadingStatus
                message={`${state().label} 모델 받는 중 · ${state().percentage}%`}
                onCancel={download.cancel}
              />
            </div>
            <span
              aria-label="모델 다운로드 진행률"
              aria-valuemax="100"
              aria-valuemin="0"
              aria-valuenow={state().percentage}
              class="sr-only"
              role="progressbar"
            />
          </div>
        )}
      </Match>
      <Match when={errorState()}>
        {(state) => (
          <div aria-live="assertive" class={ERROR_CLASSES} role="alert">
            <span aria-hidden="true" class="i-tabler-alert-circle size-4 flex-none text-danger" />
            <span>{state().message}</span>
            <button class={DISMISS_CLASSES} onClick={download.dismissError} type="button">
              닫기
            </button>
          </div>
        )}
      </Match>
    </Switch>
  )
}
