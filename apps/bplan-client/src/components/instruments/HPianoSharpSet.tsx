import {createMemo, For, JSX, Show, splitProps} from 'solid-js'
import {KeyContext} from './key-context'
import {sharpSet} from 'src/use/instruments'

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
