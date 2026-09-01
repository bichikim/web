import {createSignal} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'

import type {PuppetParameter} from '../../player/document'
import '../story.css'
import {EditorKeyformPanel} from './EditorKeyformPanel'

const PARAMETERS: ReadonlyArray<PuppetParameter> = [
  {
    defaultValue: 0,
    id: 'angle-x',
    keyforms: [
      {parts: [], value: -30},
      {parts: [], value: 0},
      {parts: [], value: 30},
    ],
    maximum: 30,
    minimum: -30,
    name: 'Angle X',
    targetPartIds: ['face', 'hair-front'],
  },
  {
    defaultValue: 0,
    id: 'eye-open',
    keyforms: [
      {parts: [], value: 0},
      {parts: [], value: 1},
    ],
    maximum: 1,
    minimum: 0,
    name: 'Eye Open',
    targetPartIds: ['eye-left', 'eye-right'],
  },
]

const InteractivePanel = () => {
  const [activeParameterId, setActiveParameterId] = createSignal('angle-x')
  const [activeKeyformValue, setActiveKeyformValue] = createSignal<number | null>(0)
  const [value, setValue] = createSignal(0)

  return (
    <EditorKeyformPanel
      activeKeyformValue={activeKeyformValue()}
      activeParameterId={activeParameterId()}
      parameters={PARAMETERS}
      selectedPartIds={['face']}
      targetPartIds={['face', 'hair-front']}
      value={value()}
      onKeyformAdd={fn()}
      onKeyformDelete={fn()}
      onKeyformSelect={(parameterId, keyformValue) => {
        setActiveParameterId(parameterId)
        setActiveKeyformValue(keyformValue)
        setValue(keyformValue)
      }}
      onParameterAdd={fn()}
      onParameterDelete={fn()}
      onParameterNameChange={fn()}
      onParameterSelect={(parameterId) => {
        setActiveParameterId(parameterId)
        setActiveKeyformValue(null)
        const parameter = PARAMETERS.find((entry) => entry.id === parameterId)
        setValue(parameter?.defaultValue ?? 0)
      }}
      onSelectionConnect={fn()}
      onSelectionDisconnect={fn()}
      onValueChange={setValue}
    />
  )
}

const meta = {
  args: {
    parameters: PARAMETERS,
  },
  argTypes: {
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
  render: () => <InteractivePanel />,
}

export const Empty: Story = {
  args: {parameters: []},
}
