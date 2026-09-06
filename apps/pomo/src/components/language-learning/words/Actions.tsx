import * as m from '@paraglide/message'
import {type LanguageLearningWord} from '../../../features/language-learning'
import {PButton} from '../../PButton'

interface LanguageLearningWordActionsProps {
  readonly onDelete: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly onToggleMemorized: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly selectedWords: ReadonlyArray<LanguageLearningWord>
}

export const LanguageLearningWordActions = (props: LanguageLearningWordActionsProps) => {
  const selectedCount = () => props.selectedWords.length
  const allMemorized = () =>
    props.selectedWords.length > 0 && props.selectedWords.every((word) => word.memorized)
  const toggleLabel = () =>
    allMemorized()
      ? m.learning_words_unmark_selected({count: selectedCount()})
      : m.learning_words_mark_selected({count: selectedCount()})

  return (
    <div class="flex flex-wrap items-center gap-2" role="group">
      <span class="mr-auto text-xs font-650 text-muted-foreground">
        {m.learning_words_selection_count({count: selectedCount()})}
      </span>
      <PButton
        accessibleLabel={toggleLabel()}
        disabled={selectedCount() === 0}
        icon="i-tabler-check"
        onPress={() => props.onToggleMemorized(props.selectedWords)}
        size="small"
        tone="secondary"
      >
        {allMemorized() ? m.learning_words_unmark_action() : m.learning_words_mark_action()}
      </PButton>
      <PButton
        accessibleLabel={m.learning_words_delete_selected({count: selectedCount()})}
        disabled={selectedCount() === 0}
        icon="i-tabler-trash"
        onPress={() => props.onDelete(props.selectedWords)}
        size="small"
        tone="danger"
      >
        {m.learning_words_delete_action()}
      </PButton>
    </div>
  )
}
