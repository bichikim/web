import {
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
  splitProps,
} from 'solid-js'
import {cva} from 'class-variance-authority'
import {HUNDRED} from '@winter-love/utils'
import {sx} from '@winter-love/solid-use'

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

  const [innerProps, restProps] = splitProps(props, ['move', 'class', 'speed', 'style'])
  const [width, setWidth] = createSignal(0)
  const [isMove, setIsMove] = createSignal(false)

  onMount(() => {
    setWidth(element()?.clientWidth ?? 0)
  })

  const duration = createMemo(() => {
    return (width() / HUNDRED) * (innerProps.speed ?? 1)
  })

  const move = createMemo(() => innerProps.move)

  createEffect(() => {
    const width = element()?.clientWidth ?? 0
    const parentWidth = element()?.parentElement?.clientWidth ?? 0

    setIsMove(Boolean(move() && parentWidth < width))
  })

  const translateX = createMemo(() => {
    if (isMove()) {
      return ''
    }

    return '0%'
  })

  return (
    <span
      {...restProps}
      ref={setElement}
      class={rootStyle({class: innerProps.class, move: isMove()})}
      style={sx(
        {
          'animation-duration': `${duration()}s`,
          transform: `translateX(${translateX()})`,
        },
        innerProps.style,
      )}
    >
      {props.children}
      <Show when={isMove()}> {props.children}</Show>
    </span>
  )
}
