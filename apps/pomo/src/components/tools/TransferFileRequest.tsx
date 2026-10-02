import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PButton} from '../p-button/PButton'
import {formatFileSize} from './ReceivedFileCard'

interface TransferFileRequestProps {
  readonly file: {readonly name: string; readonly size: number}
  readonly mode: 'incoming' | 'outgoing'
  readonly onAccept?: () => void
  readonly onReject?: () => void
}

export const TransferFileRequest = (props: TransferFileRequestProps) => (
  <section class="grid min-w-0 gap-4 rounded-panel border border-border bg-surface-overlay p-4">
    <div class="flex items-center gap-3">
      <span class="grid size-9 shrink-0 place-items-center rounded-control bg-primary-soft text-primary">
        <span
          aria-hidden="true"
          class={
            props.mode === 'incoming' ? 'i-tabler-download size-5' : 'i-tabler-hourglass size-5'
          }
        />
      </span>
      <div class="min-w-0">
        <h3 class="m-0 text-sm font-700" role={props.mode === 'outgoing' ? 'status' : undefined}>
          {props.mode === 'incoming' ? m.transfer_incoming_title() : m.transfer_offer_pending()}
        </h3>
        <p class="mb-0 mt-1 text-xs leading-5 text-muted-foreground">
          {props.mode === 'incoming'
            ? m.transfer_incoming_description()
            : m.transfer_outgoing_description()}
        </p>
      </div>
    </div>
    <div class="min-w-0 rounded-control bg-background px-3 py-2.5">
      <p class="m-0 break-words text-sm font-600 [overflow-wrap:anywhere]">{props.file.name}</p>
      <p class="mb-0 mt-1 text-xs tabular-nums text-muted-foreground">
        {formatFileSize(props.file.size)}
      </p>
    </div>
    <Show when={props.mode === 'incoming'}>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <PButton
          size="small"
          tone="danger"
          transparent
          bordered
          icon="i-tabler-x"
          onPress={props.onReject}
        >
          {m.transfer_reject()}
        </PButton>
        <PButton size="small" icon="i-tabler-download" onPress={props.onAccept}>
          {m.transfer_accept()}
        </PButton>
      </div>
    </Show>
  </section>
)
