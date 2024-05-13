import {WScrollBody} from 'src/components/scroll/WScrollBody'
import {Meta, StoryObj} from 'storybook-solidjs'
import {WScroll} from './WScroll'
import {WScrollBar} from './WScrollBar'
import {WScrollHandel} from './WScrollHandel'

const meta = {
  component: WScrollBody,
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <WScroll class="w-200px h-200px bg-yello relative">
      <WScrollBody
        class="overflow-auto relative w-full h-full scrollbar-none"
        yBar={
          <WScrollBar
            type="vertical"
            class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
            thickness="0.5rem"
          >
            <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
          </WScrollBar>
        }
        xBar={
          <WScrollBar
            type="horizontal"
            class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
            thickness="0.5rem"
          >
            <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
          </WScrollBar>
        }
      >
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
      </WScrollBody>
    </WScroll>
  ),
}

export const WidthDefault: Story = {
  render: () => (
    <WScroll class="w-200px h-200px bg-yello relative">
      <WScrollBody
        class="overflow-auto relative w-full h-full scrollbar-none"
        style="background-color: rgb(calc(var(--ver-scroll-y-percent) * 100 + 155),
         calc(var(--ver-scroll-x-percent) * 100 + 155), 0);"
        yBar={
          <WScrollBar
            class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
            thickness="0.5rem"
          >
            <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
          </WScrollBar>
        }
        xBar={
          <WScrollBar
            class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
            thickness="0.5rem"
          >
            <WScrollHandel class="absolute bg-red left-var right-var top-var w-var h-var" />
          </WScrollBar>
        }
      >
        <div class="w-500px">
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
          foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar foo bar
        </div>
      </WScrollBody>
    </WScroll>
  ),
}
