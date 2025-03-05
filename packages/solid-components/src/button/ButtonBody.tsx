import {ButtonContext} from './context'
import {Dynamic} from 'solid-js/web'
import {ComponentProps, useContext} from 'solid-js'

export interface ButtonBodyProps
  extends Omit<
    ComponentProps<'button'>,
    'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'
  > {
  //
}

export const ButtonBody = (props: ButtonBodyProps) => {
  const [
    buttonContextValue,
    {handleClick, handleDoubleClick, handleTouchEnd, handleTouchStart},
  ] = useContext(ButtonContext)

  return (
    <Dynamic
      {...props}
      component={buttonContextValue().tag}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      href={buttonContextValue().href}
    >
      {props.children}
    </Dynamic>
  )
}
