import type {Preview} from '@kachurun/storybook-solid-vite'
import 'virtual:uno.css'

const preview: Preview = {
  parameters: {
    // automatically create action args for all props that start with "on"
    actions: {argTypesRegex: '^on.*'},

    backgrounds: {
      default: 'chessboard',
      values: [
        {
          name: 'chessboard',
          value: 'repeating-linear-gradient(45deg, #000 0, #000 25px, #fff 25px, #fff 50px)',
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
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      codePanel: true,
    },
  },
  // tags: ['autodocs'],
}

export default preview
