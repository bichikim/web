import * as m from '@paraglide/message'
import {PButton} from '../../PButton'
import {LanguageLearningTagInput} from '../TagInput'

interface LanguageLearningWordInputSectionProps {
  readonly inputValue: string
  readonly onInputChange: (value: string) => void
  readonly onSave: () => void
  readonly onTagsChange: (values: ReadonlyArray<string>) => void
  readonly saveDisabled: boolean
  readonly tags: ReadonlyArray<string>
}

export const LanguageLearningWordInputSection = (props: LanguageLearningWordInputSectionProps) => (
  <div class="grid gap-3 rounded-panel border border-solid border-border bg-content-surface p-4">
    <LanguageLearningTagInput
      description={m.learning_words_input_hint()}
      getRemoveLabel={(word) => m.learning_words_remove({word})}
      inputValue={props.inputValue}
      label={m.learning_words_input()}
      onInputChange={props.onInputChange}
      onTagsChange={props.onTagsChange}
      placeholder={m.learning_words_input_placeholder()}
      tags={props.tags}
    />
    <PButton class="w-full" disabled={props.saveDisabled} onPress={props.onSave}>
      {m.learning_words_save()}
    </PButton>
  </div>
)
