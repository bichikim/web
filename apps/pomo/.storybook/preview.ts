import '@unocss/reset/tailwind.css'
import 'uno.css'

document.documentElement.classList.add('dark')

import {createComponent} from 'solid-js'
import {PreferenceProvider} from '../src/hooks/use-preference'
import preview from '../../../.storybook/preview'
import {PTooltipContent, PTooltipProvider} from '../src/components/tooltip'

export default {
  ...preview,
  decorators: [
    ...(preview.decorators ?? []),
    (Story: () => ReturnType<typeof createComponent>) =>
      createComponent(PreferenceProvider, {
        get children() {
          return Story()
        },
      }),
    (Story: () => ReturnType<typeof createComponent>) =>
      createComponent(PTooltipProvider, {
        get children() {
          return [Story(), createComponent(PTooltipContent, {})]
        },
      }),
  ],
}
