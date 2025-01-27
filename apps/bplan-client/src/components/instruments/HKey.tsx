import {Show, splitProps, useContext} from 'solid-js'
import {HRealButton, HRealButtonProps} from 'src/components/real-button/HRealButton'
import {KeyContext} from './key-context'
import {PianoContext} from './piano-context'
import {SKeyEffect} from './SKeyEffect'
import {cx} from 'class-variance-authority'

export interface HKeyProps extends HRealButtonProps {
  effectClass?: string
  key?: string | number
  name?: string
  showKeyName?: boolean
}

// instrument key
export const HKey = (props: HKeyProps) => {
  const {onDown: onKeyDown, onUp: onKeyUp, down} = useContext(PianoContext)
  const [innerProps, restProps] = splitProps(props, [
    'key',
    'name',
    'effectClass',
    'children',
    'showKeyName',
  ])
  const {key, disabled, name} = useContext(KeyContext)

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
      <SKeyEffect
        class={cx(
          'absolute top--4 left-0 w-full h-full pointer-events-none',
          innerProps.effectClass,
        )}
      />
      <Show when={innerProps.showKeyName}>
        <span class="mb-2">{name}</span>
      </Show>
      {innerProps.children}
    </HRealButton>
  )
}
