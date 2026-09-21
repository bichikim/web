import * as m from '@paraglide/message'
import {localizeModelDownloadSize} from '../../features/model-storage'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'

export interface PModelDownloadConsentProps {
  readonly actionLabel: string
  readonly downloadSize: string
  readonly isOpen: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export const PModelDownloadConsent = (props: PModelDownloadConsentProps) => (
  <PModal
    closeButtonVisibility="hidden"
    isOpen={props.isOpen}
    onOpenChange={(isOpen) => {
      if (!isOpen) {
        props.onCancel()
      }
    }}
    title={m.dialogue_download_title({size: localizeModelDownloadSize(props.downloadSize)})}
  >
    <div class="grid gap-5">
      <p class="m-0 text-sm leading-6 text-foreground">{m.dialogue_download_network_note()}</p>
      <p class="m-0 text-sm leading-5 text-muted-foreground">
        {m.dialogue_download_storage_note({action: props.actionLabel})}
      </p>
      <div class="flex justify-end gap-2">
        <PButton bordered transparent onPress={props.onCancel} tone="secondary">
          {m.dialogue_download_cancel()}
        </PButton>
        <PButton raised onPress={props.onConfirm}>
          {m.dialogue_download_start()}
        </PButton>
      </div>
    </div>
  </PModal>
)
