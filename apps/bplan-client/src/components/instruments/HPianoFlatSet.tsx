import {createMemo, For, JSX, splitProps} from 'solid-js'
import {KeyContext} from './key-context'
import {flatSet} from 'src/use/instruments'

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
