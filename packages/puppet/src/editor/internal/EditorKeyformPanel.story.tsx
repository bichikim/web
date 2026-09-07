import {createSignal} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'

import type {PuppetParameterValues} from '../../deformation'
import {createDemoDocument} from '../../player'
import {EditorKeyformPanel} from './EditorKeyformPanel'

const DOCUMENT = createDemoDocument()
const BINDINGS = DOCUMENT.parameterBindings ?? []
const PARAMETERS = DOCUMENT.parameters ?? []

const InteractivePanel = () => {
  const [activeBindingId, setActiveBindingId] = createSignal(BINDINGS[0]?.id)
  const [activeKeyformValues, setActiveKeyformValues] = createSignal<PuppetParameterValues | null>([
    0, 0,
  ])
  const [values, setValues] = createSignal<PuppetParameterValues>([0, 0])

  return (
    <EditorKeyformPanel
      activeBindingId={activeBindingId()}
      activeKeyformValues={activeKeyformValues()}
      bindings={BINDINGS}
      parameters={PARAMETERS}
      selectedPartIds={['mesh-preview']}
      targetPartIds={['mesh-preview']}
      values={values()}
      onBindingDelete={fn()}
      onBindingSelect={(bindingId) => {
        setActiveBindingId(bindingId)
        setActiveKeyformValues(null)
      }}
      onKeyformAdd={fn()}
      onKeyformDelete={fn()}
      onKeyformSelect={(bindingId, keyformValues) => {
        setActiveBindingId(bindingId)
        setActiveKeyformValues(keyformValues)
        setValues(keyformValues)
      }}
      onParameterAdd={fn()}
      onParameterNameChange={fn()}
      onSelectionConnect={fn()}
      onSelectionDisconnect={fn()}
      onTwoDimensionalParameterAdd={fn()}
      onValueChange={setValues}
    />
  )
}

const meta = {
  args: {
    bindings: BINDINGS,
    parameters: PARAMETERS,
  },
  argTypes: {
    bindings: {control: false, table: {category: 'Props'}},
    parameters: {control: false, table: {category: 'Props'}},
  },
  component: EditorKeyformPanel,
  decorators: [
    (Story) => (
      <div class="puppet-editor puppet-story-surface">
        <Story />
      </div>
    ),
  ],
  title: 'Puppet/Editor/Parameters/EditorKeyformPanel',
} satisfies Meta<typeof EditorKeyformPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  args: {},
  render: () => <InteractivePanel />,
}

export const Empty: Story = {
  args: {bindings: [], parameters: []},
}
