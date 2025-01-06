import {JSX, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {HButton} from 'src/components/button'

export interface SPlayerButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onTouchEnd'> {
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent | TouchEvent>
}

/**
 * A styled button component for media player controls.
 *
 * This component provides a styled button specifically designed for media player controls.
 * It is built on top of HButton and provides consistent design and touch/click event handling.
 *
 * @example
 * ```tsx
 * <SPlayerButton onClick={(e) => console.log('Player button clicked!', e)}>
 *   Play
 * </SPlayerButton>
 * ```
 *
 * @param props {SPlayerButtonProps} The props for the button component
 * @prop {(event: Event) => void} [onClick] - Event handler for click events
 */
export const SPlayerButton = (props: SPlayerButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['onClick'])

  const handelClick: SPlayerButtonProps['onClick'] = (event) => {
    innerProps.onClick?.(event)
  }

  return (
    <HButton
      {...restProps}
      class={cx(
        'flex px-6px py-2px b-0 rd-1 cursor-pointer overflow-hidden bg-#f4f5f6 justify-center items-center text-black',
        props.class,
      )}
      onClick={handelClick}
    >
      {props.children}
    </HButton>
  )
}
