import {useContext} from 'solid-js'
import {PianoContext} from './piano-context'
import {KeyContext} from './key-context'
import {HRealButton, HRealButtonProps} from 'src/components/real-button/HRealButton'

export interface HKeyProps extends HRealButtonProps {
  key?: string | number
}

// instrument key
export const HKey = (props: HKeyProps) => {
  const {onDown: onKeyDown, onUp: onKeyUp} = useContext(PianoContext)
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

  return (
    <HRealButton
      {...props}
      onDown={handleDown}
      onUp={handleUp}
      disabled={disabled()}
      aria-label={`key ${key}`}
    >
      {props.children}
    </HRealButton>
  )
}
