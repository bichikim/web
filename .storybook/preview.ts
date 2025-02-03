import {Preview} from 'storybook-solidjs'
import 'virtual:uno.css'

const preview: Preview = {
  parameters: {
    actions: {argTypesRegex: '^on.*'},
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/iu,
        date: /date$/iu,
      },
    },
  },
  // tags: ['autodocs'],
}

export default preview
