import * as m from '@paraglide/message'
import {PButton} from '../p-button/PButton'
import {PProgress} from '../p-progress/PProgress'

export interface DownloadStatusProps {
  readonly onCancel: () => void
  readonly progress: number
  readonly kind?: 'text' | 'voice' | null
}

export const DownloadStatus = (props: DownloadStatusProps) => {
  const percentage = () => Math.round(props.progress)
  const message = () =>
    props.kind === 'voice'
      ? m.tarot_voice_downloading({percent: String(percentage())})
      : m.tarot_downloading({percent: String(percentage())})

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
          class="h-full w-[var(--download-progress)] bg-current"
          style={{'--download-progress': `${percentage()}%`}}
        />
      </div>
      <PProgress label={message()} value={percentage()} />
    </div>
  )
}
