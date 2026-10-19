// oxlint-disable no-magic-numbers -- QR quiet-zone geometry and percentage scaling use fixed values.
import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'

import {fileTransfer} from 'src/features/file-transfer/session'
import {TransferConnectionInfo} from './TransferConnectionInfo'
import {TransferConnectionHelp} from './TransferConnectionHelp'
import {ReceivedFiles} from './ReceivedFiles'
import {TransferFileRequest} from './TransferFileRequest'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import {PProgress} from '../p-progress/PProgress'

const handleFile = (event: Event & {currentTarget: HTMLInputElement}): void => {
  const file = event.currentTarget.files?.[0]
  event.currentTarget.value = ''
  if (file !== undefined) {
    fileTransfer.send(file)
  }
}

export const Transfer = () => {
  const handlePanelRef = (element: HTMLElement) => {
    panel = element
  }
  const transfer = fileTransfer.state
  const [details, setDetails] = createSignal(false)
  let panel: HTMLElement | undefined
  let detailsTrigger: HTMLButtonElement | undefined
  const handleDetailsOpen = (source: HTMLButtonElement) => {
    detailsTrigger = source
    setDetails(true)
  }
  const connected = () =>
    ['connected', 'sending', 'receiving', 'offer-pending'].includes(transfer.phase)
  const handleDetailsChange = (open: boolean) => {
    setDetails(open)
    if (!open && !connected()) {
      fileTransfer.cancel()
    }
  }
  const handleDetailsFocus = () => {
    const target = detailsTrigger?.isConnected
      ? detailsTrigger
      : panel?.querySelector<HTMLButtonElement>('button')
    target?.focus()
  }
  return (
    <section ref={handlePanelRef} class="grid min-w-0 gap-4" aria-label={m.tools_transfer()}>
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="m-0 text-lg font-750 text-foreground">{m.tools_transfer()}</h2>
          <Show when={connected()}>
            <span
              role="status"
              class="inline-flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span aria-hidden="true" class="size-1.5 rounded-full bg-secondary" />
              {m.transfer_connected()}
            </span>
          </Show>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Show when={transfer.joinUrl !== null && connected()}>
            <PButton
              size="small"
              tone="glass"
              transparent
              icon="i-tabler-qrcode"
              accessibleLabel={m.transfer_connection_details()}
              tooltip={m.transfer_connection_details()}
              pressed={details()}
              onPress={handleDetailsOpen}
            />
          </Show>
          <Show
            when={connected() || transfer.phase === 'creating' || transfer.phase === 'connecting'}
          >
            <PButton
              size="small"
              tone="glass"
              transparent
              icon="i-tabler-plug-off"
              onPress={fileTransfer.cancel}
            >
              {m.transfer_cancel()}
            </PButton>
          </Show>
        </div>
      </header>
      <Show when={!fileTransfer.isConfigured}>
        <p role="status" class="m-0 text-muted-foreground">
          {m.transfer_unavailable()}
        </p>
      </Show>
      <Show when={fileTransfer.isConfigured && !fileTransfer.isActive}>
        <PButton onPress={fileTransfer.create}>{m.transfer_create()}</PButton>
      </Show>
      <PModal
        title={m.transfer_connection_details()}
        isOpen={fileTransfer.isActive && transfer.joinUrl !== null && (!connected() || details())}
        onOpenChange={handleDetailsChange}
        onCloseAutoFocus={handleDetailsFocus}
      >
        <Show when={transfer.joinUrl}>
          {(url) => (
            <TransferConnectionInfo
              url={url()}
              connected={connected()}
              waiting={transfer.phase === 'waiting'}
              connecting={transfer.phase === 'connecting'}
              onApprove={
                transfer.phase === 'approval-needed' || transfer.phase === 'connecting'
                  ? fileTransfer.approve
                  : undefined
              }
            />
          )}
        </Show>
      </PModal>
      <Show when={transfer.phase === 'creating' || transfer.phase === 'connecting'}>
        <p role="status" class="m-0">
          {m.transfer_joining()}
        </p>
      </Show>
      <ReceivedFiles />
      <Show when={transfer.phase === 'connected' && transfer.incoming === null}>
        <label class="grid gap-2">
          <span>{m.transfer_select()}</span>
          <input
            type="file"
            class={
              'min-w-0 w-full rounded-control border border-dashed border-border ' +
              'bg-surface-overlay p-4 text-sm file:mr-3 file:rounded-control file:border-0 ' +
              'file:bg-primary file:px-3 file:py-2 file:text-white'
            }
            onChange={handleFile}
          />
        </label>
      </Show>
      <Show when={transfer.phase === 'offer-pending' ? transfer.outgoing : null}>
        {(file) => <TransferFileRequest mode="outgoing" file={file()} />}
      </Show>
      <Show when={transfer.phase === 'connected' ? transfer.incoming : null}>
        {(file) => (
          <TransferFileRequest
            mode="incoming"
            file={file()}
            onAccept={fileTransfer.accept}
            onReject={fileTransfer.reject}
          />
        )}
      </Show>
      <Show when={transfer.phase === 'sending' || transfer.phase === 'receiving'}>
        <PProgress
          presentation="bar"
          label={transfer.phase === 'sending' ? m.transfer_sending() : m.transfer_receiving()}
          value={transfer.progress * 100}
        />
      </Show>
      <Show when={transfer.error !== null}>
        <p role="alert" class="m-0 text-red-500">
          {transfer.error}
        </p>
      </Show>
      <Show when={transfer.errorCode === 'direct-connection'}>
        <TransferConnectionHelp />
      </Show>
    </section>
  )
}
