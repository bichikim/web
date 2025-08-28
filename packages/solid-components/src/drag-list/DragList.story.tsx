import type {Meta, StoryObj} from 'storybook-solidjs'
import {DragList} from './DragList'
import {createSignal, onCleanup} from 'solid-js'
import {DragListProvider} from './DragListProvider'
import {DragItem} from './DragItem'

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

  const interval = createInterval(() => {
    setList((prev) => {
      const newList = [...prev]

      newList.unshift({id: String(newList.length + 1), name: String(newList.length + 1)})

      return newList
    })
  })

  const handleAddingStart = () => {
    interval.start(1000)
  }

  const handleAddingEnd = () => {
    interval.stop()
  }

  const handleChangeList = (from: number, to: number, list: {id: string; name: string}[]) => {
    setList(list)
  }

  return (
    <div>
      <DragList
        list={list()}
        direction="vertical"
        idDetector={args.idDetector}
        class="flex flex-col gap-1rem"
        component="div"
        onChangeList={handleChangeList}
      >
        <DragItem component="div" class="w-10rem h-2rem bg-red-500 data-[dragging=true]:opacity-0">
          {(item) => item.name}
        </DragItem>
      </DragList>
      <div class="flex gap-1rem">
        <button onClick={handleAddingStart}>Adding Start</button>
        <button onClick={handleAddingEnd}>Adding End</button>
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
