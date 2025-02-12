import {JSX, mergeProps, splitProps} from 'solid-js'
import {HButtonType} from '@winter-love/solid-components'
import {SButton, SButtonProps} from 'src/components/button'

export interface SPlayerButtonProps
  extends Pick<SButtonProps, 'class' | 'children' | 'title' | 'type'> {
  href?: string
  onClick?: JSX.EventHandler<HTMLElement, MouseEvent | TouchEvent>
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
  const defaultProps = mergeProps({type: 'button' as HButtonType}, props)

  const [innerProps, restProps] = splitProps(defaultProps, ['class', 'type', 'onClick'])

  const handelClick: SPlayerButtonProps['onClick'] = (event) => {
    innerProps.onClick?.(event)
  }

  // px-6px py-2px b-0 rd-1 cursor-pointer bg-gray-100 overflow-hidden

  return (
    <SButton
      {...restProps}
      flat
      variant="default"
      class={innerProps.class}
      onClick={handelClick}
      type={innerProps.type}
    >
      {props.children}
    </SButton>
  )
}
