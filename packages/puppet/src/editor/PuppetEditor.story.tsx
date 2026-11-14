import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {createDemoDocument} from '../player'
import {PuppetEditor} from './PuppetEditor'
import type {PuppetEditorProps} from './types'
import {createElementModel} from '../editor-element/create-element-model'

const EditorStory = (props: Omit<PuppetEditorProps, 'model'>) => {
  const model = createElementModel({document: createDemoDocument(), sessionId: 'storybook'})
  return (
    <div class="puppet-editor-story">
      <PuppetEditor {...props} model={model} />
    </div>
  )
}

const meta = {
  component: EditorStory,
  parameters: {layout: 'fullscreen'},
  title: 'Puppet/Editor/PuppetEditor',
} satisfies Meta<typeof EditorStory>

export default meta
type Story = StoryObj<typeof meta>

export const ModelingWorkspace: Story = {}
