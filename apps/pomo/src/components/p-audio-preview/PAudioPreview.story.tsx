import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PAudioPreview} from './PAudioPreview'

interface PreviewPlayContext {
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    onRequest: fn(),
    src: 'https://storage.pomofi.io/tracks/brunch-terrace.mp3?v=20260830',
    title: 'Brunch Terrace',
  },
  argTypes: {
    autoplay: {control: 'boolean', table: {category: 'Props'}},
    loading: {control: 'boolean', table: {category: 'State'}},
    onRequest: {table: {category: 'Events'}, type: {name: 'function'}},
    paused: {control: 'boolean', table: {category: 'State'}},
    preload: {
      control: 'select',
      options: ['none', 'metadata', 'auto'],
      table: {category: 'Props'},
    },
    src: {control: 'text', table: {category: 'Props'}},
    title: {control: 'text', table: {category: 'Accessibility'}},
  },
  component: PAudioPreview,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 w-full place-items-center bg-#17130f p-6">
        <div class="w-full max-w-xl">
          <Story />
        </div>
      </main>
    ),
  ],
  title: 'Pomo/Components/PAudioPreview',
} satisfies Meta<typeof PAudioPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  play: async ({canvasElement}: PreviewPlayContext) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', {name: 'Brunch Terrace 재생'})).toBeVisible()
    await expect(canvas.getByRole('slider', {name: 'Brunch Terrace 재생 위치'})).toBeVisible()
    await expect(canvas.getByRole('button', {name: 'Brunch Terrace 음소거'})).toBeVisible()
  },
}

export const Request: Story = {
  args: {src: null},
  play: async ({canvasElement}: PreviewPlayContext) => {
    const button = within(canvasElement).getByRole('button', {name: 'Brunch Terrace 미리 듣기'})

    await userEvent.click(button)
    await expect(meta.args.onRequest).toHaveBeenCalledOnce()
  },
}

export const Loading: Story = {args: {loading: true, src: null}}
