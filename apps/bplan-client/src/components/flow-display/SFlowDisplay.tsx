import {ComponentProps, createMemo, createSignal, onMount, splitProps} from 'solid-js'
import {cva} from 'class-variance-authority'
import {HUNDRED} from '@winter-love/utils'
import {sx} from '@winter-love/solid-use'
import {i} from 'vite/dist/node/types.d-aGj9QkWt'

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

  onMount(() => {
    setWidth(element()?.clientWidth ?? 0)
  })

  const duration = createMemo(() => {
    return (width() / HUNDRED) * (innerProps.speed ?? 1)
  })

  const translateX = createMemo(() => {
    if (innerProps.move) {
      return ''
    }

    return '0%'
  })

  return (
    <span
      {...restProps}
      ref={setElement}
      class={rootStyle({class: innerProps.class, move: innerProps.move})}
      style={sx(
        {
          'animation-duration': `${duration()}s`,
          transform: `translateX(${translateX()})`,
        },
        innerProps.style,
      )}
    >
      {props.children}
      {props.children}
    </span>
  )
}
