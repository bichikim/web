import {createMemo, For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {fileTransfer, receivedFiles} from 'src/features/file-transfer/session'
import {PButton} from '../p-button/PButton'
import {PSwitch} from '../p-switch/PSwitch'
import {formatFileSize, ReceivedFileCard} from './ReceivedFileCard'

const files = () => receivedFiles.state.files

export const ReceivedFiles = () => {
  const deleted = createMemo(() => files().filter((file) => file.url === null).length)
  const available = createMemo(() => files().length - deleted())
  return (
    <section
      class="grid min-w-0 gap-3 border-t border-border pt-4"
      aria-label={m.transfer_collection()}
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h3 class="m-0 text-base font-bold">
              {m.transfer_collection()} · {files().length}
            </h3>
            <Show when={fileTransfer.isActive}>
              <PSwitch
                class="gap-2 [&_label]:text-xs [&_label]:font-500 [&_label]:text-muted-foreground"
                label={m.transfer_auto_accept()}
                checked={fileTransfer.state.autoAccept}
                onChange={fileTransfer.setAutoAccept}
              />
            </Show>
          </div>
          <p class="mb-0 mt-1 text-xs text-muted-foreground">
            {formatFileSize(receivedFiles.retainedBytes())} / 300 MB · {m.transfer_page_storage()}
          </p>
        </div>
        <Show when={files().length > 0}>
          <div class="flex shrink-0 items-center gap-1">
            <PButton
              size="small"
              icon="i-tabler-download"
              tone="glass"
              transparent
              disabled={available() === 0 || receivedFiles.state.saving}
              onPress={receivedFiles.saveAll}
            >
              {receivedFiles.state.saving ? m.transfer_archiving() : m.transfer_save_all()}
            </PButton>
            <PButton
              size="small"
              tone="glass"
              transparent
              disabled={receivedFiles.state.saving}
              icon="i-tabler-trash"
              accessibleLabel={m.transfer_remove_all()}
              tooltip={m.transfer_remove_all()}
              onPress={receivedFiles.removeAll}
            />
            <Show when={deleted() > 0}>
              <PButton
                size="small"
                tone="glass"
                transparent
                disabled={receivedFiles.state.saving}
                icon="i-tabler-trash-x"
                accessibleLabel={`${m.transfer_clear_removed()} · ${deleted()}`}
                tooltip={`${m.transfer_clear_removed()} · ${deleted()}`}
                onPress={receivedFiles.clearRemoved}
              />
            </Show>
          </div>
        </Show>
      </div>

      <Show
        when={files().length > 0}
        fallback={
          <p class="m-0 rounded-panel border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {m.transfer_empty()}
          </p>
        }
      >
        <div class="overflow-x-auto overscroll-x-contain pb-2">
          <div role="list" aria-label={m.transfer_collection()} class="flex w-max gap-4 p-1">
            <For each={files()}>
              {(file) => (
                <div role="listitem" class="w-64 shrink-0">
                  <ReceivedFileCard file={file} />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      <Show when={receivedFiles.state.error}>
        <p role="alert" class="m-0 text-danger">
          {m.transfer_archive_failed()}
        </p>
      </Show>
    </section>
  )
}
