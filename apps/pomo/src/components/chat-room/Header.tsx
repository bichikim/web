import {cx} from 'class-variance-authority'
import {PSelect, type PSelectOption} from '../PSelect'
import {TEXT_MODELS, type TextModelId} from '../../features/text-generation/index'

const MODEL_OPTIONS: ReadonlyArray<PSelectOption<TextModelId>> = TEXT_MODELS.map((model) => ({
  label: `${model.label} · ${model.downloadSize}`,
  value: model.id,
}))

interface ChatHeaderProps {
  readonly disabled: boolean
  readonly modelId: TextModelId
  readonly onModelChange: (modelId: TextModelId) => void
}

export const ChatHeader = (props: ChatHeaderProps) => (
  <header
    class={cx(
      'flex flex-col gap-5 border-b border-white/8 px-5 py-5',
      'xs:flex-row xs:items-start xs:justify-between xs:px-7',
    )}
  >
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.24em] text-#9ed6bb uppercase">
        Private on-device chat
      </p>
      <h1 class="mb-0 mt-2 text-2xl font-780 tracking--0.025em xs:text-3xl">
        로컬 모델과 이어서 대화해요
      </h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
        오래된 대화는 중요한 기억만 남기고 자동으로 압축해요.
      </p>
    </div>
    <div class="w-full shrink-0 xs:w-64">
      <PSelect
        disabled={props.disabled}
        hideLabel
        label="채팅 모델"
        onChange={props.onModelChange}
        options={MODEL_OPTIONS}
        value={props.modelId}
      />
    </div>
  </header>
)
