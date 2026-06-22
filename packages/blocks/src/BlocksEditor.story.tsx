import {createSignal, onCleanup, onMount} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, within} from 'storybook/test'
import {type BlocksEditor, createBlocksEditor, createBlocksWorkspace} from './index'

interface StoryEditorProps {
  readonly initialText: string
}

const StoryEditor = (props: StoryEditorProps) => {
  const [container, setContainer] = createSignal<HTMLDivElement>()
  let editor: BlocksEditor | undefined

  onMount(() => {
    const element = container()

    if (element === undefined) {
      return
    }

    const workspace = createBlocksWorkspace({
      initialText: props.initialText,
    })

    workspace.init()
    editor = createBlocksEditor({
      className: 'min-h-150 border border-neutral-200 bg-white',
      workspace,
    })
    editor.mount(element)
  })

  onCleanup(() => {
    editor?.destroy()
  })

  return <div ref={setContainer} />
}

const meta = {
  argTypes: {
    initialText: {
      control: 'text',
      table: {category: 'Props'},
    },
  },
  component: StoryEditor,
  title: 'Blocks/Components/BlocksEditor',
} satisfies Meta<typeof StoryEditor>

export default meta
type Story = StoryObj<typeof meta>
type PlayContext = Parameters<NonNullable<Story['play']>>[0]

export const Default: Story = {
  args: {
    initialText: 'Storybook can render the vanilla Blocks editor.',
  },
  play: async ({canvasElement}: PlayContext) => {
    const canvas = within(canvasElement)

    await canvas.findByText('Storybook can render the vanilla Blocks editor.')
    expect(canvasElement.querySelector('.winter-blocks-editor')).toBeInTheDocument()
  },
}
