import {clampDisplayedPercentage} from 'src/utils/clamp-displayed-percentage'
import * as m from '@paraglide/message'
import {createMemo} from 'solid-js'
import {PButton} from '../p-button/PButton'
import {PProgress} from '../p-progress/PProgress'

export interface DownloadStatusProps {
  readonly onCancel: () => void
  readonly progress: number
  readonly kind?: 'text' | 'voice' | null
}

export const DownloadStatus = (props: DownloadStatusProps) => {
  const percentage = createMemo(() => {
    if (!Number.isFinite(props.progress)) {
      return undefined
    }

    return clampDisplayedPercentage(Math.round(props.progress))
  })
  const message = createMemo(() => {
    const currentPercentage = percentage()
    if (currentPercentage === undefined) {
      return props.kind === 'voice'
        ? m.tarot_voice_downloading_indeterminate()
        : m.tarot_downloading_indeterminate()
    }

    return props.kind === 'voice'
      ? m.tarot_voice_downloading({percent: String(currentPercentage)})
      : m.tarot_downloading({percent: String(currentPercentage)})
  })

  return (
    <div role="status" class="grid w-full max-w-56 min-w-0 gap-2 text-[#d8b97e]">
      <div class="flex items-center gap-2">
        <p class="m-0 min-w-0 flex flex-1 items-center gap-2 text-xs font-650">
          <span aria-hidden="true" class="i-tabler-download size-4 shrink-0" />
          {message()}
        </p>
        <PButton
          accessibleLabel={m.tarot_cancel_download()}
          class="size-8 shrink-0 !p-0"
          icon="i-tabler-x"
          onPress={props.onCancel}
          size="small"
          tooltip={m.tarot_cancel_download()}
          tone="secondary"
          transparent
        />
      </div>
      <div aria-hidden="true" class="h-1 overflow-hidden rounded-full bg-[#d8b97e20]">
        <div
          class={
            'h-full w-[var(--download-progress)] bg-current data-[indeterminate]:w-1/3 ' +
            'data-[indeterminate]:animate-pulse motion-reduce:animate-none'
          }
          data-indeterminate={percentage() === undefined ? '' : undefined}
          style={
            percentage() === undefined ? undefined : {'--download-progress': `${percentage()}%`}
          }
        />
      </div>
      <PProgress label={message()} value={percentage()} />
    </div>
  )
}
