import {createSignal, JSX, Show, splitProps, useContext} from 'solid-js'
import {HRealButton, HRealButtonProps} from 'src/components/real-button/HRealButton'
import {KeyContext} from './key-context'
import {PianoContext} from './piano-context'

export interface HKeyProps extends HRealButtonProps {
  key?: string | number
  name?: string
}

// instrument key
export const HKey = (props: HKeyProps) => {
  const {onDown: onKeyDown, onUp: onKeyUp, down} = useContext(PianoContext)
  const [innerProps, restProps] = splitProps(props, ['key', 'name', 'children'])
  const {key, disabled} = useContext(KeyContext)

  function handleDown() {
    const _key = key ?? innerProps.key

    if (_key) {
      onKeyDown(_key)
    }
  }

  function handleUp() {
    const _key = key ?? innerProps.key

    if (_key) {
      onKeyUp(_key)
    }
  }

  function renderDown() {
    if (!key) {
      return false
    }

    return down().has(key)
  }

  return (
    <HRealButton
      {...restProps}
      id={key ?? innerProps.key}
      renderDown={renderDown()}
      onDown={handleDown}
      onUp={handleUp}
      disabled={disabled()}
      title={`${innerProps.name} key ${key}`}
    >
      {innerProps.children}
    </HRealButton>
  )
}
