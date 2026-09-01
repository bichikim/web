import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'

const BUTTON_CLASS = cx(
  'min-h-11 cursor-pointer rounded-full border-0 bg-highlight px-5 font-750 text-[#241a12]',
  'disabled:cursor-not-allowed disabled:opacity-40',
)

export interface LanguageLearningGenerateButtonProps {
  readonly disabled?: boolean
  readonly onPress: () => void
}

export const LanguageLearningGenerateButton = (props: LanguageLearningGenerateButtonProps) => (
  <button
    class={BUTTON_CLASS}
    disabled={props.disabled}
    onClick={() => props.onPress()}
    type="button"
  >
    {m.learning_editor_generate()}
  </button>
)
