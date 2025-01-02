import {flatten} from '@winter-love/lodash'
import {createMemo, For, JSX, splitProps} from 'solid-js'
import {KeyContext} from './key-context'

interface FlatData {
  key: number
  name: string
}

const keyOffset = 5
const keyCount = 12
const flatSet = flatten(
  Array.from<FlatData[]>({length: 14})
    .fill([
      {key: 2, name: 'A'},
      {key: 4, name: 'B'},
      {key: 5, name: 'C'},
      {key: 7, name: 'D'},
      {key: 9, name: 'E'},
      {key: 10, name: 'F'},
      {key: 12, name: 'G'},
    ])
    .map((item, index) => {
      return item.map(({key, name}) => ({key: keyCount * index + key - keyOffset, name}))
    }),
)
const lastDeleteCount = 4

flatSet.splice(lastDeleteCount * -1)

export interface HPianoFlatSetProps extends JSX.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
}

export const HPianoFlatSet = (_props: HPianoFlatSetProps) => {
  const [props, attrs] = splitProps(_props, ['disabled', 'children'])
  const disabled = createMemo(() => Boolean(props.disabled))

  return (
    <div {...attrs}>
      <For each={flatSet}>
        {(item) => (
          <KeyContext.Provider value={{...item, disabled}}>
            {props.children}
          </KeyContext.Provider>
        )}
      </For>
    </div>
  )
}
