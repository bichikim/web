import {ComponentProps, useContext} from 'solid-js'
import {FlowDisplayContext} from './FlowDisplayRoot'

export interface FlowTextContextProps extends ComponentProps<'span'> {
  //
}

export const FlowTextContent = (props: FlowTextContextProps) => {
  const [flowDisplayContext] = useContext(FlowDisplayContext)

  return (
    <span {...props} data-move={flowDisplayContext().move}>
      {props.children}
    </span>
  )
}
