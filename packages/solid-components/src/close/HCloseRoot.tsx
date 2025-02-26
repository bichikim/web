import {createSignal, ParentProps} from 'solid-js'
import {CloseContext, CloseContextValue} from './context'
import {freeze} from '@winter-love/utils'

export const HCloseRoot = (props: ParentProps) => {
  const [show, setShow] = createSignal({show: true})

  const handleShow = (value: boolean) => {
    setShow((prev) => ({...prev, show: value}))
  }

  const context: CloseContextValue = freeze([show, {handleShow}])

  return <CloseContext.Provider value={context}>{props.children}</CloseContext.Provider>
}
