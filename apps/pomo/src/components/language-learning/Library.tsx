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

export const LanguageLearningLibrary = () => {
  const events = usePEvents()
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const sentences = useLanguageLearningSentences()
  const filteredEntries = createMemo(() => {
    const currentSentences = sentences()
    if (currentSentences.length === 0) {
      return []
    }

    const dialoguesById = Map.groupBy(events.dialogues(), (dialogue) => dialogue.id)
    return currentSentences.flatMap((sentence) => {
      const dialogue = dialoguesById.get(sentence.dialogueId)?.[0]
      return dialogue === undefined || dialogue.language !== language()
        ? []
        : [
            {
              dialogue,
            },
          ]
    })
  })

  return (
    <section class="grid gap-4.5 settings-compact:gap-4">
      <div class="flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-between">
        <LanguageLearningLanguageSelect
          class="min-w-40"
          onChange={setLanguage}
          value={language()}
        />
        <PSettingsActionLink size="medium" href="/language-learning" icon="i-tabler-plus">
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
          textLineLimit="six"
        />
      </Show>
    </section>
  )
}
