import {cx} from 'class-variance-authority'
import {For, Match, Show, Switch} from 'solid-js'

import {useModelDownload} from '../features/model-download'
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

  return (
    <Show when={download.downloads().length > 0}>
      <div class="grid max-h-64 gap-2 overflow-y-auto" aria-label="모델 다운로드 목록">
        <For each={download.downloads()}>
          {(item) => {
            const loadingState = () => (item.status === 'loading' ? item : null)
            const errorState = () => (item.status === 'error' ? item : null)
            return (
              <Switch>
                <Match when={loadingState()}>
                  {(state) => (
                    <div aria-live="polite" class="pointer-events-auto" role="status">
                      <div class="border border-solid border-border rounded-control backdrop-blur-surface">
                        <PLoadingStatus
                          message={`${state().label} 모델 받는 중 · ${state().percentage}%`}
                          onCancel={() => download.cancel(item.target)}
                        />
                      </div>
                      <PProgress label="모델 다운로드 진행률" value={state().percentage} />
                    </div>
                  )}
                </Match>
                <Match when={errorState()}>
                  {(state) => (
                    <PFormMessage class={ERROR_CLASSES} tone="error">
                      <span
                        aria-hidden="true"
                        class="i-tabler-alert-circle size-4.5 flex-none text-danger"
                      />
                      <span>
                        {state().label}: {state().message}
                      </span>
                      <PButton
                        onPress={() => download.dismissError(item.target)}
                        size="small"
                        tone="secondary"
                      >
                        닫기
                      </PButton>
                    </PFormMessage>
                  )}
                </Match>
                <Match when={item.status === 'queued'}>
                  <div class={ERROR_CLASSES} role="status">
                    <span>{item.label} · 다운로드 대기 중</span>
                    <PButton
                      size="small"
                      tone="secondary"
                      onPress={() => download.cancel(item.target)}
                    >
                      취소
                    </PButton>
                  </div>
                </Match>
              </Switch>
            )
          }}
        </For>
      </div>
    </Show>
  )
}
