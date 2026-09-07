import * as m from '@paraglide/message'
import {PAppReturnLink} from '../PAppReturnLink'

export const LanguageLearningEditorHeader = () => (
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="m-0 text-3xl">{m.learning_editor_title()}</h1>
    <PAppReturnLink />
  </header>
)
