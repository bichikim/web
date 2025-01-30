import {createMemo, JSX, Show, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {HButton, HButtonProps} from '@winter-love/solid-components'

export interface SPlayerButtonProps
  extends Pick<HButtonProps, 'class' | 'children' | 'title'> {
  href?: string
  onClick?: JSX.EventHandler<HTMLElement, MouseEvent | TouchEvent>
  type?: 'button' | 'anchor'
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
  const [innerProps, restProps] = splitProps(props, ['onClick', 'class', 'type', 'href'])

  const handelClick: SPlayerButtonProps['onClick'] = (event) => {
    innerProps.onClick?.(event)
  }

  const className = createMemo(() =>
    cx(
      'flex px-6px py-2px b-0 rd-1 cursor-pointer overflow-hidden bg-#f4f5f6 justify-center items-center text-black',
      innerProps.class,
    ),
  )

  return (
    <Show
      when={innerProps.type === 'button'}
      fallback={
        <a
          {...restProps}
          class={className()}
          onClick={handelClick}
          href={innerProps.href}
        >
          {props.children}
        </a>
      }
    >
      <HButton {...restProps} class={className()} onClick={handelClick}>
        {props.children}
      </HButton>
    </Show>
  )
}
