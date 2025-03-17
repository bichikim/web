import {createMemo, ParentProps} from 'solid-js'
import {CloseContext, CloseContextValue} from './context'
import {freeze} from '@winter-love/utils'

export interface CloseProviderProps extends ParentProps {
  onShowChange?: (value: boolean) => void
  show?: boolean
}

export const CloseProvider = (props: CloseProviderProps) => {
  const handleShow = (value: boolean) => {
    props.onShowChange?.(value)
  }

  const show = createMemo(() => Boolean(props.show))

  const context: CloseContextValue = freeze([show, {handleShow}])

  return <CloseContext.Provider value={context}>{props.children}</CloseContext.Provider>
}
