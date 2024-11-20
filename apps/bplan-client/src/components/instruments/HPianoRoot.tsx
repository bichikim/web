import {ParentProps} from 'solid-js'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'
import {PianoContext} from './piano-context'

export type HPianoRootProps = ParentProps

export const HPianoRoot = (props: HPianoRootProps) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})
  const onDown = (key) => {
    console.log(key, 'down')
    //
  }

  const onUp = (key) => {
    //
    console.log(key, 'up')
  }

  return (
    <PianoContext.Provider value={{onDown, onUp, scale: 100}}>
      {props.children}
    </PianoContext.Provider>
  )
}
