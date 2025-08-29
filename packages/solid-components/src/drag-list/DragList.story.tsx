import type {Meta, StoryObj} from 'storybook-solidjs'
import {DragList} from './DragList'
import {createSignal, onCleanup} from 'solid-js'
import {DragListItem} from './DragListItem'

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
      <DragList
        list={list()}
        idDetector={args.idDetector}
        class="flex flex-col gap-1rem"
        component="div"
        onChangeList={handleChangeList}
      >
        <DragListItem component="div" class="w-10rem h-2rem bg-red-500 data-[dragging=true]:opacity-0 select-none">
          {(item) => item.name}
        </DragListItem>
      </DragList>
      <div class="flex gap-1rem">
        <button onClick={handleAddingStart}>Adding Start</button>
        <button onClick={handleAddingEnd}>Adding End</button>
        <button onClick={handleRemoveStart}>Remove Start</button>
        <button onClick={handleRemoveEnd}>Remove End</button>
      </div>
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
