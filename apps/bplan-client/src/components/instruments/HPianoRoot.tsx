import {ParentProps} from 'solid-js'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'
import {PianoContext} from './piano-context'

export type HPianoRootProps = ParentProps & {
  onDown?: (key: string | number) => void
  onUp?: (key: string | number) => void
}

export const HPianoRoot = (props: HPianoRootProps) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})
  const onDown = (key: string | number) => {
    props.onDown?.(key)
  }

  const onUp = (key: string | number) => {
    props.onUp?.(key)
  }

  return (
    <PianoContext.Provider value={{onDown, onUp, scale: 100}}>
      {props.children}
    </PianoContext.Provider>
  )
}
