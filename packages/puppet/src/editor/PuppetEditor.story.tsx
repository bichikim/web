import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'

import {createDemoDocument} from '../player'
import {PuppetEditor} from './PuppetEditor'

const meta = {
  args: {
    initialDocument: createDemoDocument(),
    onDocumentChange: fn(),
  },
  argTypes: {
    initialDocument: {
      control: false,
      table: {category: 'Props'},
    },
    onDocumentChange: {
      table: {category: 'Events'},
      type: {name: 'function', required: false},
    },
  },
  component: PuppetEditor,
  parameters: {
    layout: 'fullscreen',
  },
  render: (props) => (
    <div class="puppet-editor-story">
      <PuppetEditor {...props} />
    </div>
  ),
  title: 'Puppet/Editor/PuppetEditor',
} satisfies Meta<typeof PuppetEditor>

export default meta
type Story = StoryObj<typeof meta>

export const ModelingWorkspace: Story = {}
