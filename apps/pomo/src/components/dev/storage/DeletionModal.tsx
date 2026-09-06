import {PButton} from 'src/components/PButton'
import {PModal} from 'src/components/PModal'
import {type DeletionRequest} from './deletion'

interface DeletionModalProps {
  readonly disabled: boolean
  readonly onCancel: () => void
  readonly onCloseAutoFocus: () => void
  readonly onConfirm: () => void
  readonly request: DeletionRequest | null
}

export const DeletionModal = (props: DeletionModalProps) => (
  <PModal
    closeButtonVisibility="hidden"
    isOpen={props.request !== null}
    onCloseAutoFocus={props.onCloseAutoFocus}
    onOpenChange={(isOpen) => {
      if (!isOpen) {
        props.onCancel()
      }
    }}
    title="모델 데이터 삭제"
  >
    <p class="m-0 text-sm leading-6 text-foreground">{props.request?.label}</p>
    <div class="mt-5 flex justify-end gap-2">
      <PButton onPress={props.onCancel} size="small" tone="secondary">
        취소
      </PButton>
      <PButton disabled={props.disabled} onPress={props.onConfirm} size="small" tone="danger">
        삭제 확정
      </PButton>
    </div>
  </PModal>
)
