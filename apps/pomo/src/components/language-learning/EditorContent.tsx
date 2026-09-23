import {clientOnly} from '@solidjs/start'

export const LanguageLearningEditorContent = clientOnly(
  async () => {
    const {LanguageLearningEditor} = await import('./Editor')
    return {default: LanguageLearningEditor}
  },
  {lazy: true},
)
