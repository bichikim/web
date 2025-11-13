import {DelegatedEventProvider} from './DelegatedEvent'
import {FocusControllerProvider} from './FocusController'
import {useFocus} from './focus'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'

export interface FocusProps {
  deepPosition: DeepPosition
}

export const Focus = (props: FocusProps) => {
  const {isFocused, setIsFocused} = useFocus(() => props.deepPosition)

  const handleClick = () => {
    setIsFocused(!isFocused())
  }

  return <button onClick={handleClick}>{isFocused() ? 'Focused' : 'Unfocused'}</button>
}

export const FocusControllerSampleBody = () => {
  return (
    <div>
      <Focus deepPosition={[{x: 0, y: 0}]} />
      <Focus deepPosition={[{x: 1, y: 0}]} />
      <Focus deepPosition={[{x: 0, y: 1}]} />
      <Focus deepPosition={[{x: 1, y: 1}]} />
    </div>
  )
}

export const FocusControllerSample = () => {
  return (
    <DelegatedEventProvider>
      <FocusControllerProvider>
        <FocusControllerSampleBody />
      </FocusControllerProvider>
    </DelegatedEventProvider>
  )
}
