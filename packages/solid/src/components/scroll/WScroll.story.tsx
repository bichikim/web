import {WScrollBody} from 'src/components/scroll/WScrollBody'
import {Meta, StoryObj} from 'storybook-solidjs'
import {WScroll} from './WScroll'
import {WScrollBar} from './WScrollBar'
import {WScrollHandel} from './WScrollHandel'

const meta = {
  component: WScrollBody,
} satisfies Meta
export default meta

const fooBarPrinter = (size: number) => {
  return Array.from({length: size}).fill('foo bar').join(' ')
}

type Story = StoryObj<typeof meta>

export const YOnlyScroll: Story = {
  render: () => (
    <WScroll class="w-200px h-200px bg-yello relative">
      <WScrollBody class="overflow-auto relative w-full h-full scrollbar-none">
        {fooBarPrinter(200)}
      </WScrollBody>
      <WScrollBar
        type="vertical"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
      </WScrollBar>
      <WScrollBar
        type="horizontal"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
      </WScrollBar>
    </WScroll>
  ),
}

export const XYScroll: Story = {
  render: () => (
    <WScroll class="w-200px h-200px bg-yello relative">
      <WScrollBody
        class="overflow-auto relative w-full h-full scrollbar-none"
        style="background-color: rgb(calc(var(--ver-scroll-y-percent) * 100 + 155),
         calc(var(--ver-scroll-x-percent) * 100 + 155), 255);"
      >
        <div class="w-500px">{fooBarPrinter(200)}</div>
      </WScrollBody>
      <WScrollBar
        type="vertical"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
      </WScrollBar>
      <WScrollBar
        type="horizontal"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
      </WScrollBar>
    </WScroll>
  ),
}
