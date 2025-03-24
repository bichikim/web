import {ButtonContext} from './context'
import {Dynamic} from 'solid-js/web'
import {ComponentProps, createSignal, useContext} from 'solid-js'
import _ from 'lodash'

export interface ButtonBodyProps
  extends Omit<
    ComponentProps<'button'>,
    'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'
  > {
  //
}

export const ButtonBody = (props: ButtonBodyProps) => {
  const [buttonContextValue, {handleClick, handleTouchEnd, handleTouchStart}] =
    useContext(ButtonContext)

  return (
    <Dynamic
      {...props}
      component={buttonContextValue().tag}
      onClick={handleClick}
      onDblClick={undefined}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      href={buttonContextValue().href}
    >
      {props.children}
    </Dynamic>
  )
}
