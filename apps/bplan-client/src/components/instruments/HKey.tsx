import {createMemo, splitProps, useContext} from 'solid-js'
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
  const [innerProps, restProps] = splitProps(props, ['key', 'name'])
  const {key, disabled} = useContext(KeyContext)

  const handleDown = () => {
    const _key = key ?? innerProps.key
    if (_key) {
      onKeyDown(_key)
    }
  }

  const handleUp = () => {
    const _key = key ?? innerProps.key
    if (_key) {
      onKeyUp(_key)
    }
  }

  const renderDown = createMemo(() => {
    if (!key) {
      return false
    }
    return down().has(key)
  })

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
      {props.children}
    </HRealButton>
  )
}
