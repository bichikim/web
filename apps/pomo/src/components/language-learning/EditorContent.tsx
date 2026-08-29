import {clientOnly} from '@solidjs/start'

export const LanguageLearningEditorContent = clientOnly(() => import('./Editor'), {lazy: true})
