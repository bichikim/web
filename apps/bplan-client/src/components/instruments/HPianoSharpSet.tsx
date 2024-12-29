import {flatten} from '@winter-love/lodash'
import {createMemo, For, JSX, Show, splitProps} from 'solid-js'
import {KeyContext} from './key-context'

interface SharpData {
  key: number
  name: string
}

const keyLoopCount = 12
const lastDeleteCount = 5
const sharpSet = flatten(
  Array.from<SharpData[]>({length: 8})
    .fill([
      {key: 1, name: 'G#'},
      {key: 3, name: 'A#'},
      {key: 0, name: 'empty'},
      {key: 6, name: 'C#'},
      {key: 8, name: 'D#'},
      {key: 0, name: 'empty'},
      {key: 11, name: 'F#'},
    ])
    .map((item, index) => {
      return item.map(({key, name}) => ({
        key: keyLoopCount * index + key - lastDeleteCount,
        name,
      }))
    }),
)

sharpSet.shift()
sharpSet.splice(lastDeleteCount * -1)

export interface HPianoSharpSetProps extends JSX.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  emptyChildren?: JSX.Element
}

export const HPianoSharpSet = (_props: HPianoSharpSetProps) => {
  const [props, attrs] = splitProps(_props, ['disabled', 'emptyChildren', 'children'])
  const disabled = createMemo(() => Boolean(props.disabled))

  return (
    <div {...attrs}>
      <For each={sharpSet}>
        {(item) => (
          <Show when={item.name !== 'empty'} fallback={props.emptyChildren}>
            <KeyContext.Provider value={{...item, disabled}}>
              {props.children}
            </KeyContext.Provider>
          </Show>
        )}
      </For>
    </div>
  )
}
