import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {WScroll} from './'
import zombieGif from './zombie.gif'

const meta = {
  component: WScroll.Root,
  title: 'solid/components/WScroll',
} satisfies Meta

export default meta

const fooBarPrinter = (size: number) => {
  return Array.from({length: size}).fill('foo bar').join(' ')
}

type Story = StoryObj<typeof meta>

export const YOnlyScroll: Story = {
  render: () => (
    <WScroll.Root component="div" class="w-200px h-200px bg-yello relative">
      <WScroll.Body component="div" class="overflow-auto relative w-full h-full scrollbar-none">
        {fooBarPrinter(200)}
      </WScroll.Body>
      <WScroll.Bar
        component="div"
        barType="vertical"
        class="bg-green left-var top-0 right-0 w-0.5rem h-full absolute data-[show=false]:hidden"
      >
        <WScroll.Handle component="div" class="absolute bg-red right-0 top-var-position w-full h-var-size" />
      </WScroll.Bar>
      <WScroll.Bar
        component="div"
        barType="horizontal"
        class="bg-green left-0 bottom-0 w-full h-0.5rem absolute data-[show=false]:hidden"
      >
        <WScroll.Handle component="div" class="absolute bg-red left-var-position w-var-size h-full" />
      </WScroll.Bar>
    </WScroll.Root>
  ),
}

export const XYScroll: Story = {
  render: () => (
    <WScroll.Root component="div" class="w-200px h-200px bg-yello relative pb-1rem pr-1rem">
      <WScroll.Body
        component="div"
        class="overflow-auto relative w-full h-full scrollbar-none"
        style={{
          'background-color':
            'rgb(calc(var(--var-y-percent) * 100 + 155),\n         calc(var(--var-x-percent) * 100 + 155), 255)',
        }}
      >
        <div class="w-700px">{fooBarPrinter(400)}</div>
      </WScroll.Body>
      <WScroll.Bar
        component="div"
        tabindex="0"
        barType="vertical"
        class="bg-green top-0 right-0 w-1rem h-full absolute data-[show=false]:hidden"
        style={{'background-color': 'rgb(calc(var(--var-percent) * 255), 100, 255)'}}
      >
        <WScroll.Handle
          component="div"
          tabindex="0"
          class="absolute left-0 top-var-position h-var-size @hover-outline outline-3 outline-black
            rd-0.5rem select-none data-[state=move]:outline"
        >
          <img draggable="false" src={zombieGif} alt="zombe" class="h-full rd-0.5rem overflow-hidden" />
        </WScroll.Handle>
      </WScroll.Bar>
      <WScroll.Bar
        component="div"
        barType="horizontal"
        class="bg-green left-0 bottom-0 w-full h-1rem absolute data-[show=false]:hidden"
        style={{'background-color': 'rgb(calc(var(--var-percent) * 255), 255, 100)'}}
        thickness="0.5rem"
      >
        <WScroll.Handle
          component="div"
          tabindex="0"
          class="absolute left-var-position w-var-size h-full rd-0.5rem [&>.shadow]:blur-sm
           [&>.block]:data-[state=move]:outline [&>.block]:data-[state=move]:translate-y--10px
           @hover-[&:hover>.block]:outline select-none"
        >
          <div class="shadow absolute w-full h-full bg-black/50 rd-0.5rem" />
          <div
            class="block absolute w-full h-full rd-0.5rem
             outline-3 outline-white "
            style={{'background-color': 'rgb(100, calc(var(--var-percent) * 255), 255)'}}
          />
        </WScroll.Handle>
      </WScroll.Bar>
    </WScroll.Root>
  ),
}
