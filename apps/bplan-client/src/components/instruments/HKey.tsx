import {createMemo, useContext} from 'solid-js'
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
  const {key, disabled} = useContext(KeyContext)

  const handleDown = () => {
    const _key = key ?? props.key
    if (_key) {
      onKeyDown(_key)
    }
  }

  const handleUp = () => {
    const _key = key ?? props.key
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
      {...props}
      renderDown={renderDown()}
      onDown={handleDown}
      onUp={handleUp}
      disabled={disabled()}
      aria-label={`${props.name} key ${key}`}
    >
      {props.children}
    </HRealButton>
  )
}
