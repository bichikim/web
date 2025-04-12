import {
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Show,
  splitProps,
} from 'solid-js'
import {cva} from 'class-variance-authority'
import {getWindow, HUNDRED} from '@winter-love/utils'
import {sx, useEvent} from '@winter-love/solid-use'

export interface SFlowDisplayProps extends ComponentProps<'span'> {
  move?: boolean
  speed?: number
}

const rootStyle = cva('relative block', {
  variants: {
    move: {
      true: 'animate-slide-text',
    },
  },
})

export const SFlowDisplay = (props: SFlowDisplayProps) => {
  const [element, setElement] = createSignal<HTMLSpanElement | null>(null)
  const [textElement, setTextElement] = createSignal<HTMLSpanElement | null>(null)
  const [width, setWidth] = createSignal(0)
  const [innerProps, restProps] = splitProps(props, ['move', 'class', 'speed', 'style'])

  const isMove = createMemo(() => {
    const _move = innerProps.move
    const _width = width()
    const parentWidth = element()?.parentElement?.clientWidth ?? 0

    return Boolean(_move && parentWidth < _width)
  })

  const duration = createMemo(() => {
    const _move = isMove()

    if (_move) {
      const _width = width()

      return (_width / HUNDRED) * (innerProps.speed ?? 1)
    }

    return 0
  })

  /**
   * set width after render
   */
  createEffect(() => {
    const _move = innerProps.move

    if (_move) {
      setWidth(textElement()?.getBoundingClientRect().width ?? 0)
    }
  })

  const globalTarget = createMemo(() => {
    if (innerProps.move) {
      return getWindow()
    }

    return null
  })

  useEvent(globalTarget, 'resize', () => {
    setWidth(textElement()?.getBoundingClientRect().width ?? 0)
  })

  return (
    <span
      {...restProps}
      ref={setElement}
      class={rootStyle({class: innerProps.class, move: isMove()})}
      style={sx(
        {
          'animation-duration': `${duration()}s`,
        },
        innerProps.style,
      )}
    >
      <span ref={setTextElement}>{props.children}</span>
      <Show when={isMove()}>
        <span>{props.children}</span>
      </Show>
    </span>
  )
}
