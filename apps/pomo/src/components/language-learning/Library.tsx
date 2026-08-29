import {createMemo, createSignal, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {usePEvents} from '../../features/focus-room-dialogue'
import {
  deleteLanguageLearningSentence,
  type LanguageLearningLanguage,
  useLanguageLearningSentences,
} from '../../features/language-learning'
import {DialogueLibrary} from '../dialogue-settings/Library'
import {PSettingsActionLink} from '../settings/ActionLink'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {LanguageLearningLanguageSelect} from './LanguageSelect'

export interface LanguageLearningLibraryProps {
  readonly onRequestClose?: () => void
}

export const LanguageLearningLibrary = (props: LanguageLearningLibraryProps) => {
  const events = usePEvents()
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const sentences = useLanguageLearningSentences()
  const filteredEntries = createMemo(() =>
    sentences().flatMap((sentence) => {
      const dialogue = events.dialogues().find((item) => item.id === sentence.dialogueId)
      return dialogue === undefined || dialogue.language !== language()
        ? []
        : [
            {
              dialogue,
            },
          ]
    }),
  )

  return (
    <section class="pomo-learning-library grid gap-4.5 settings-compact:gap-4">
      <div class="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between">
        <LanguageLearningLanguageSelect
          class="min-w-40"
          onChange={setLanguage}
          value={language()}
        />
        <PSettingsActionLink
          class="min-h-control-md"
          href="/language-learning"
          icon="i-tabler-plus"
        >
          {m.learning_create_action()}
        </PSettingsActionLink>
      </div>

      <Show
        when={filteredEntries().length > 0}
        fallback={<PSettingsEmptyState>{m.learning_empty()}</PSettingsEmptyState>}
      >
        <DialogueLibrary
          entries={filteredEntries()}
          onAfterDelete={(dialogue) => deleteLanguageLearningSentence(dialogue.id)}
          onRequestClose={props.onRequestClose}
          textLineLimit="six"
        />
      </Show>
    </section>
  )
}
