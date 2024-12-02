import {Preview} from 'storybook-solidjs'
import 'virtual:uno.css'

const preview: Preview = {
  parameters: {
    actions: {argTypesRegex: '^on[A-Z].*'},
    controls: {
      matchers: {
        color: /(background|color)$/iu,
        date: /date$/iu,
      },
    },
  },
}

export default preview
