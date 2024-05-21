import {Meta, StoryObj} from 'storybook-solidjs'
import {WScroll} from './'
import zombieGif from './zombie.gif'

const meta = {
  component: WScroll.Root,
} satisfies Meta

export default meta

const fooBarPrinter = (size: number) => {
  return Array.from({length: size}).fill('foo bar').join(' ')
}

type Story = StoryObj<typeof meta>

export const YOnlyScroll: Story = {
  render: () => (
    <WScroll.Root class="w-200px h-200px bg-yello relative">
      <WScroll.Body class="overflow-auto relative w-full h-full scrollbar-none">
        {fooBarPrinter(200)}
      </WScroll.Body>
      <WScroll.Bar
        type="vertical"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScroll.Handle class="absolute bg-red left-var right-var top-var w-full h-var" />
      </WScroll.Bar>
      <WScroll.Bar
        type="horizontal"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        thickness="0.5rem"
      >
        <WScroll.Handle class="absolute bg-red left-var right-var top-var w-var h-full" />
      </WScroll.Bar>
    </WScroll.Root>
  ),
}

export const XYScroll: Story = {
  render: () => (
    <WScroll.Root class="w-200px h-200px bg-yello relative">
      <WScroll.Body
        class="overflow-auto relative w-full h-full scrollbar-none"
        style="background-color: rgb(calc(var(--ver-scroll-y-percent) * 100 + 155),
         calc(var(--ver-scroll-x-percent) * 100 + 155), 255);"
      >
        <div class="w-500px">{fooBarPrinter(200)}</div>
      </WScroll.Body>
      <WScroll.Bar
        type="vertical"
        class="bg-green left-var top-var bottom-var right-var w-var h-var absolute"
        style="background-color: rgb(calc(var(--ver-bar-percent) * 255), 100, 255);"
        thickness="0.5rem"
      >
        <WScroll.Handle class="absolute left-var right-var top-var w-var h-var">
          <img
            draggable="false"
            src={zombieGif}
            alt="zombe"
            class="h-full rd-0.5rem overflow-hidden"
          />
        </WScroll.Handle>
      </WScroll.Bar>
      <WScroll.Bar
        type="horizontal"
        class="bg-green left-var bottom--1rem right-var w-var h-1rem absolute rd-0.5rem"
        style="background-color: rgb(calc(var(--ver-bar-percent) * 255), 255, 100);"
        thickness="0.5rem"
      >
        <WScroll.Handle
          class="absolute left-var right-var w-var h-full rd-0.5rem [&:focus>.shadow]:blur-sm
            [&>.block]:data-[state=move]:translate-y--10px [&:focus>.block]:outline"
        >
          <div class="shadow absolute w-full h-full bg-black/50 rd-0.5rem"></div>
          <div
            class="block absolute w-full h-full rd-0.5rem
             outline-3 outline-white "
            style="background-color: rgb(100, calc(var(--ver-bar-percent) * 255), 255);"
          />
        </WScroll.Handle>
      </WScroll.Bar>
    </WScroll.Root>
  ),
}
