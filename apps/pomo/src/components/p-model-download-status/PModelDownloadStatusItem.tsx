import {clampDisplayedPercentage} from 'src/utils/clamp-displayed-percentage'
import {cx} from 'class-variance-authority'
import {type Accessor, createMemo, Match, Switch} from 'solid-js'

import type {
  ErrorModelDownloadState,
  LoadingModelDownloadState,
  ModelDownloadItem,
  ModelDownloadTarget,
  QueuedModelDownloadState,
} from '../../features/model-download'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {PProgress} from '../p-progress/PProgress'
import {useDownloadStatusItem} from './use-download-status-item'

const ERROR_CLASSES = cx(
  'pointer-events-auto flex min-h-control-sm items-center gap-2',
  'border border-solid border-border rounded-control bg-surface px-3',
  'text-foreground text-sm font-650 shadow-panel backdrop-blur-surface',
)

const getDisplayPercentage = (percentage: number) =>
  Number.isFinite(percentage) ? clampDisplayedPercentage(percentage) : undefined

export interface PModelDownloadStatusItemProps {
  readonly item?: ModelDownloadItem
  readonly onCancel: (target: ModelDownloadTarget) => void
  readonly onDismissError: (target: ModelDownloadTarget) => void
}

export const PModelDownloadStatusItem = (props: PModelDownloadStatusItemProps) => {
  const status = useDownloadStatusItem(() => props.item)
  const handleCancel = () => {
    const current = props.item
    if (current !== undefined) {
      props.onCancel(current.target)
    }
  }
  const handleDismissError = () => {
    const current = props.item
    if (current !== undefined) {
      props.onDismissError(current.target)
    }
  }
  const handleLoading = (state: Accessor<LoadingModelDownloadState>) => {
    const display = createMemo(() => {
      const current = state()
      const percentage = getDisplayPercentage(current.percentage)
      return {
        message:
          percentage === undefined
            ? `${current.label} 모델 받는 중`
            : `${current.label} 모델 받는 중 · ${percentage}%`,
        percentage,
      }
    })

    return (
      <div aria-live="polite" class="pointer-events-auto" role="status">
        <div class="border border-solid border-border rounded-control backdrop-blur-surface">
          <PLoadingStatus message={display().message} onCancel={handleCancel} />
        </div>
        <PProgress label="모델 다운로드 진행률" value={display().percentage} />
      </div>
    )
  }
  const handleError = (state: Accessor<ErrorModelDownloadState>) => (
    <PFormMessage class={ERROR_CLASSES} tone="error">
      <span aria-hidden="true" class="i-tabler-alert-circle size-4.5 flex-none text-danger" />
      <span>
        {state().label}: {state().message}
      </span>
      <PButton bordered transparent onPress={handleDismissError} size="small" tone="secondary">
        닫기
      </PButton>
    </PFormMessage>
  )
  const handleQueued = (state: Accessor<QueuedModelDownloadState>) => (
    <div class={ERROR_CLASSES} role="status">
      <span>{state().label} · 다운로드 대기 중</span>
      <PButton bordered transparent size="small" tone="secondary" onPress={handleCancel}>
        취소
      </PButton>
    </div>
  )

  return (
    <Switch>
      <Match when={status.loading()}>{handleLoading}</Match>
      <Match when={status.error()}>{handleError}</Match>
      <Match when={status.queued()}>{handleQueued}</Match>
    </Switch>
  )
}
