import type {Preview} from 'storybook-solidjs-vite'

import {EditorStyles} from '../src/editor/internal/EditorStyles'

const preview: Preview = {
  decorators: [
    (Story) => (
      <>
        <EditorStyles />
        <Story />
      </>
    ),
  ],
  parameters: {
    actions: {argTypesRegex: '^on.*'},
    backgrounds: {
      options: {
        canvas: {name: 'Puppet canvas', value: '#0b0f0e'},
        panel: {name: 'Puppet panel', value: '#101513'},
        white: {name: 'White', value: '#ffffff'},
      },
    },
    controls: {
      matchers: {
        color: /(?:background|color)$/iu,
        date: /Date$/u,
      },
    },
    docs: {codePanel: true},
    initialGlobals: {background: 'canvas'},
  },
}

export default preview
