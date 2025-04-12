import {ComponentProps, useContext} from 'solid-js'
import {FlowDisplayContext} from './FlowDisplayRoot'

export interface FlowTextBodyProps extends ComponentProps<'span'> {}

export const FlowDisplayBody = (props: FlowTextBodyProps) => {
  const [flowDisplayContext, {handleSelect}] = useContext(FlowDisplayContext)

  const handleClick = () => {
    handleSelect(!flowDisplayContext().move)
  }

  return (
    <span {...props} onClick={handleClick}>
      {props.children}
    </span>
  )
}
