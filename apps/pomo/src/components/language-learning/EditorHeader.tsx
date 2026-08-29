import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {getPomoHomeHref} from '../pomo-route'

export const LanguageLearningEditorHeader = () => (
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="m-0 text-3xl">{m.learning_editor_title()}</h1>
    <A
      class={cx(
        'min-h-11 inline-flex items-center rounded-full border border-solid border-border',
        'px-4 text-foreground no-underline',
      )}
      href={getPomoHomeHref(getLocale())}
    >
      {m.learning_editor_back()}
    </A>
  </header>
)
