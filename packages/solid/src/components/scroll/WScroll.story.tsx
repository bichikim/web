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
        class="bg-green left-var top-var bottom-var right-var w-0.5rem h-var absolute data-[show=false]:hidden"
      >
        <WScroll.Handle class="absolute bg-red left-var right-var top-var w-full h-var" />
      </WScroll.Bar>
      <WScroll.Bar
        type="horizontal"
        class="bg-green left-var top-var bottom-var right-var w-var h-0.5rem absolute data-[show=false]:hidden"
      >
        <WScroll.Handle class="absolute bg-red left-var right-var top-var w-var h-full" />
      </WScroll.Bar>
    </WScroll.Root>
  ),
}

export const XYScroll: Story = {
  render: () => (
    <WScroll.Root class="w-200px h-200px bg-yello relative pb-1rem pr-1rem">
      <WScroll.Body
        class="overflow-auto relative w-full h-full scrollbar-none"
        style="background-color: rgb(calc(var(--ver-scroll-y-percent) * 100 + 155),
         calc(var(--ver-scroll-x-percent) * 100 + 155), 255);"
      >
        <div class="w-700px">{fooBarPrinter(400)}</div>
      </WScroll.Body>
      <WScroll.Bar
        tabindex="0"
        type="vertical"
        class="bg-green left-var top-var bottom-var right-var w-1rem h-var absolute data-[show=false]:hidden"
        style="background-color: rgb(calc(var(--ver-bar-percent) * 255), 100, 255);"
      >
        <WScroll.Handle
          tabindex="0"
          class="absolute left-0 top-var w-var h-var focus:outline outline-3 outline-black rd-0.5rem"
        >
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
        class="bg-green left-var bottom-0 right-var w-var h-1rem absolute data-[show=false]:hidden"
        style="background-color: rgb(calc(var(--ver-bar-percent) * 255), 255, 100);"
        thickness="0.5rem"
      >
        <WScroll.Handle
          tabindex="0"
          class="absolute left-var right-var w-var h-full rd-0.5rem [&>.shadow]:blur-sm
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
