import {PButton} from '../design-system/PButton'
import {PModal} from '../design-system/PModal'

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
    title={`${props.downloadSize} 모델을 받을까요?`}
  >
    <div class="grid gap-5">
      <p class="m-0 text-sm leading-6 text-foreground">
        모바일 네트워크에서는 데이터 요금이 발생할 수 있어요. Wi-Fi 연결을 권장해요.
      </p>
      <p class="m-0 text-xs leading-5 text-muted-foreground">
        받은 모델은 보관되며, 다운로드 후 {props.actionLabel}가 자동으로 시작돼요.
      </p>
      <div class="flex justify-end gap-2">
        <PButton onPress={props.onCancel} tone="secondary">
          취소
        </PButton>
        <PButton onPress={props.onConfirm}>받고 시작</PButton>
      </div>
    </div>
  </PModal>
)
