import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {DragList} from './DragList'
import {createSignal, onCleanup, Show} from 'solid-js'
import {DragListItem} from './DragListItem'
import {DragListGhost} from './DragListGhost'
import {cva, cx} from 'class-variance-authority'

const createInterval = (callback: () => void) => {
  let flag: any

  const stop = () => {
    clearInterval(flag)
  }

  onCleanup(stop)

  return {
    start: (ms: number) => (flag = setInterval(callback, ms)),
    stop,
  }
}

const itemStyle = cx(
  'w-10rem h-2rem bg-blue-500 data-[dragging=true]:opacity-0 select-none cursor-grab rd-md p-1 data-[list-dragging=true]:cursor-unset',
  'c-white',
)

const listStyle = cva('flex gap-1rem p-2 rd-md b-2px b-gray-300 b-dashed w-fit', {
  defaultVariants: {
    landscape: false,
  },
  variants: {
    landscape: {
      false: 'flex-col',
      true: 'flex-row',
    },
  },
})

const Template = (args: any) => {
  const [list, setList] = createSignal<{id: string; name: string}[]>([
    {id: '1', name: '1'},
    {id: '2', name: '2'},
    {id: '3', name: '3'},
    {id: '4', name: '4'},
    {id: '5', name: '5'},
  ])

  const addingInterval = createInterval(() => {
    setList((prev) => {
      const newList = [...prev]

      newList.unshift({id: String(newList.length + 1), name: String(newList.length + 1)})

      return newList
    })
  })

  const removingInterval = createInterval(() => {
    setList((prev) => {
      const newList = [...prev]

      newList.shift()

      return newList
    })
  })

  const handleAddingStart = () => {
    addingInterval.start(1000)
  }

  const handleAddingEnd = () => {
    addingInterval.stop()
  }

  const handleChangeList = (from: number, to: number, list: {id: string; name: string}[]) => {
    setList(list)
  }

  const handleRemoveStart = () => {
    removingInterval.start(1000)
  }

  const handleRemoveEnd = () => {
    removingInterval.stop()
  }

  return (
    <div>
      <div class="flex gap-1rem p-1">
        <button class="bg-gray-200 rd-md p-1" onClick={handleAddingStart}>
          Adding Start
        </button>
        <button class="bg-gray-200 rd-md p-1" onClick={handleAddingEnd}>
          Adding End
        </button>
        <button class="bg-gray-200 rd-md p-1" onClick={handleRemoveStart}>
          Remove Start
        </button>
        <button class="bg-gray-200 rd-md p-1" onClick={handleRemoveEnd}>
          Remove End
        </button>
      </div>
      <DragList
        list={list()}
        idDetector={args.idDetector}
        class={listStyle({landscape: args.landscape})}
        component="div"
        onChangeList={handleChangeList}
      >
        <DragListItem
          component="div"
          class={itemStyle}
          ghost={(item, index) => (
            <Show when={args.showGhost}>
              <div class="w-10rem h-2rem bg-blue-500 c-black">{item.name}</div>
            </Show>
          )}
        >
          {(item) => item.name}
        </DragListItem>
      </DragList>
    </div>
  )
}

const meta = {
  args: {},
  component: Template,
  title: 'Solid/Components/DragList/DragList',
} satisfies Meta<typeof DragList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Landscape: Story = {
  args: {
    landscape: true,
  },
}

export const IdDetector: Story = {
  args: {
    idDetector: (item) => item.id,
  },
}

export const CustomGhost: Story = {
  args: {
    showGhost: true,
  },
}
