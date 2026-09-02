import {cx} from 'class-variance-authority'
import {Match, Switch} from 'solid-js'

import {
  type ErrorModelDownloadState,
  type LoadingModelDownloadState,
  useModelDownload,
} from '../features/model-download'
import {PButton} from './PButton'
import {PFormMessage} from './PFormMessage'
import {PLoadingStatus} from './PLoadingStatus'
import {PProgress} from './PProgress'

const ERROR_CLASSES = cx(
  'pointer-events-auto flex min-h-control-sm items-center gap-2',
  'border border-solid border-border rounded-control bg-surface px-3',
  'text-foreground text-sm font-650 shadow-panel backdrop-blur-surface',
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
            <PProgress label="모델 다운로드 진행률" value={state().percentage} />
          </div>
        )}
      </Match>
      <Match when={errorState()}>
        {(state) => (
          <PFormMessage class={ERROR_CLASSES} tone="error">
            <span aria-hidden="true" class="i-tabler-alert-circle size-4.5 flex-none text-danger" />
            <span>{state().message}</span>
            <PButton onPress={download.dismissError} size="small" tone="secondary">
              닫기
            </PButton>
          </PFormMessage>
        )}
      </Match>
    </Switch>
  )
}
