import {PButton} from 'src/components/PButton'
import {type OptionResetGroup} from 'src/features/dev-option-reset'

interface OptionGroupCardProps {
  readonly busy: boolean
  readonly group: OptionResetGroup
  readonly onReset: (group: OptionResetGroup, source: HTMLButtonElement) => void
}

export const OptionGroupCard = (props: OptionGroupCardProps) => (
  <li
    class={
      'grid gap-5 rounded-6 border border-white/10 bg-white/4 p-5 ' +
      'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6'
    }
  >
    <div>
      <h2 class="m-0 text-xl font-750">{props.group.label}</h2>
      <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">{props.group.description}</p>
      <p class="mb-0 mt-2 text-modal-detail text-#8f8297">
        저장 항목 {props.group.storageKeyCount}개
      </p>
    </div>
    <PButton
      accessibleLabel={`${props.group.label} 옵션 초기화`}
      disabled={props.busy}
      onPress={(source) => props.onReset(props.group, source)}
      size="small"
      tone="danger"
    >
      초기화
    </PButton>
  </li>
)
