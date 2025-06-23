import type {Preview} from '@kachurun/storybook-solid-vite'
import 'virtual:uno.css'

const preview: Preview = {
  parameters: {
    // automatically create action args for all props that start with "on"
    actions: {argTypesRegex: '^on.*'},
    backgrounds: {
      // values: [

      //   {
      //     name: 'chessboard',
      //     value: 'repeating-linear-gradient(45deg, #000 0, #000 25px, #fff 25px, #fff 50px)',
      //   },
      // ],
      options: {
        black: {name: 'black', value: 'black'},
        chessboard: {
          name: 'chessboard',
          value: 'repeating-linear-gradient(45deg, #000 0, #000 25px, #fff 25px, #fff 50px)',
        },
        white: {name: 'white', value: 'white'},
      },
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
    initialGlobals: {
      background: 'chessboard',
    },
  },
  // tags: ['autodocs'],
}

export default preview
