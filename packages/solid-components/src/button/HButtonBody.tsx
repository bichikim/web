import {ButtonContext} from './HButtonRoot'
import {Dynamic} from 'solid-js/web'
import {ComponentProps, useContext} from 'solid-js'

export interface HButtonBodyProps
  extends Omit<
    ComponentProps<'button'>,
    'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'
  > {
  //
}

export const HButtonBody = (props: HButtonBodyProps) => {
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
