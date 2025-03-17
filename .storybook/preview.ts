import {Preview} from 'storybook-solidjs'
import 'virtual:uno.css'

const preview: Preview = {
  parameters: {
    actions: {argTypesRegex: '^on.*'},
    backgrounds: {
      default: 'chessboard',
      values: [
        {
          name: 'chessboard',
          value:
            'repeating-linear-gradient(45deg, #000 0, #000 25px, #fff 25px, #fff 50px)',
        },
        {
          name: 'white',
          value: 'white',
        },
        {
          name: 'black',
          value: 'black',
        },
      ],
    },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/iu,
        date: /date$/iu,
      },
    },
  },
}

export default preview
