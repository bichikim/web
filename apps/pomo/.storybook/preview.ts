import 'uno.css'

document.documentElement.classList.add('dark')

import {createComponent} from 'solid-js'
import preview from '../../../.storybook/preview'
import {PTooltipContent, PTooltipProvider} from '../src/components/tooltip'

export default {
  ...preview,
  decorators: [
    ...(preview.decorators ?? []),
    (Story: () => ReturnType<typeof createComponent>) =>
      createComponent(PTooltipProvider, {
        get children() {
          return [Story(), createComponent(PTooltipContent, {})]
        },
      }),
  ],
}
