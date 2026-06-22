import {createSignal, onMount, Show} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, within} from 'storybook/test'
import {BlockSuiteEditor} from './BlockSuiteEditor'
import {type BlockSuiteWorkspace, createBlockSuiteWorkspace} from './workspace'

interface StoryEditorProps {
  readonly initialText: string
  readonly title: string
}

const StoryEditor = (props: StoryEditorProps) => {
  const [workspace, setWorkspace] = createSignal<BlockSuiteWorkspace>()

  onMount(() => {
    const nextWorkspace = createBlockSuiteWorkspace({
      initialText: props.initialText,
      title: props.title,
    })

    nextWorkspace
      .init()
      .then(() => setWorkspace(nextWorkspace))
      .catch((error: unknown) => {
        console.error('failed to initialize BlockSuite story document', error)
      })
  })

  return (
    <div class="min-h-150 border border-neutral-200 bg-white">
      <Show when={workspace()} fallback={<div class="p-5 text-neutral-500">Loading editor</div>}>
        {(readyWorkspace) => <BlockSuiteEditor class="min-h-150" doc={readyWorkspace().doc} />}
      </Show>
    </div>
  )
}

const meta = {
  argTypes: {
    initialText: {
      control: 'text',
      table: {category: 'Props'},
    },
    title: {
      control: 'text',
      table: {category: 'Props'},
    },
  },
  component: StoryEditor,
  title: 'BlockSuite/Components/BlockSuiteEditor',
} satisfies Meta<typeof StoryEditor>

export default meta
type Story = StoryObj<typeof meta>
type PlayContext = Parameters<NonNullable<Story['play']>>[0]

export const Default: Story = {
  args: {
    initialText: 'Storybook can render BlockSuite through the SolidJS wrapper.',
    title: 'BlockSuite Storybook Document',
  },
  play: async ({canvasElement}: PlayContext) => {
    const canvas = within(canvasElement)

    await canvas.findByText('Storybook can render BlockSuite through the SolidJS wrapper.')
    expect(canvasElement.querySelector('editor-host')).toBeInTheDocument()
  },
}
