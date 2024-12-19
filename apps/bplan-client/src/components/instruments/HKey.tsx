import {createMemo, useContext, splitProps} from 'solid-js'
import {PianoContext} from './piano-context'
import {KeyContext} from './key-context'
import {HRealButton, HRealButtonProps} from 'src/components/real-button/HRealButton'

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
