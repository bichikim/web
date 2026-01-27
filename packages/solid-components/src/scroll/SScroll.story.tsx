import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {SScroll} from './'
import zombieGif from './zombie.gif'

const meta = {
  component: SScroll.Root,
  title: 'solid/components/SScroll',
} satisfies Meta

export default meta

const fooBarPrinter = (size: number) => {
  return Array.from({length: size}).fill('foo bar').join(' ')
}

type Story = StoryObj<typeof meta>

export const YOnlyScroll: Story = {
  render: () => (
    <SScroll.Root component="div" class="w-200px h-200px bg-yello relative">
      <SScroll.Body component="div" class="overflow-auto relative w-full h-full scrollbar-none">
        {fooBarPrinter(200)}
      </SScroll.Body>
      <SScroll.Bar
        component="div"
        barType="vertical"
        class="bg-green left-var top-0 right-0 w-0.5rem h-full absolute data-[show=false]:hidden"
      >
        <SScroll.Handle component="div" class="absolute bg-red right-0 top-var-position w-full h-var-size" />
      </SScroll.Bar>
      <SScroll.Bar
        component="div"
        barType="horizontal"
        class="bg-green left-0 bottom-0 w-full h-0.5rem absolute data-[show=false]:hidden"
      >
        <SScroll.Handle component="div" class="absolute bg-red left-var-position w-var-size h-full" />
      </SScroll.Bar>
    </SScroll.Root>
  ),
}

export const XYScroll: Story = {
  render: () => (
    <SScroll.Root component="div" class="w-200px h-200px bg-yello relative pb-1rem pr-1rem">
      <SScroll.Body
        component="div"
        class="overflow-auto relative w-full h-full scrollbar-none"
        style={{
          'background-color':
            'rgb(calc(var(--var-y-percent) * 100 + 155),\n         calc(var(--var-x-percent) * 100 + 155), 255)',
        }}
      >
        <div class="w-700px">{fooBarPrinter(400)}</div>
      </SScroll.Body>
      <SScroll.Bar
        component="div"
        tabindex="0"
        barType="vertical"
        class="bg-green top-0 right-0 w-1rem h-full absolute data-[show=false]:hidden"
        style={{'background-color': 'rgb(calc(var(--var-percent) * 255), 100, 255)'}}
      >
        <SScroll.Handle
          component="div"
          tabindex="0"
          class="absolute left-0 top-var-position h-var-size @hover-outline outline-3 outline-black
            rd-0.5rem select-none data-[state=move]:outline"
        >
          <img draggable="false" src={zombieGif} alt="zombe" class="h-full rd-0.5rem overflow-hidden" />
        </SScroll.Handle>
      </SScroll.Bar>
      <SScroll.Bar
        component="div"
        barType="horizontal"
        class="bg-green left-0 bottom-0 w-full h-1rem absolute data-[show=false]:hidden"
        style={{'background-color': 'rgb(calc(var(--var-percent) * 255), 255, 100)'}}
        thickness="0.5rem"
      >
        <SScroll.Handle
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
        </SScroll.Handle>
      </SScroll.Bar>
    </SScroll.Root>
  ),
}
