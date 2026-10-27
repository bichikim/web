import {
  children,
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  on,
  Show,
  splitProps,
} from 'solid-js'
import {cva} from 'class-variance-authority'
import {getWindow, HUNDRED} from '@winter-love/utils'
import {useEvent, useStyles} from '@winter-love/solid-use'

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
  const [dimensions, setDimensions] = createSignal({parentWidth: 0, textWidth: 0})
  const [innerProps, restProps] = splitProps(props, ['move', 'class', 'speed', 'style'])
  const content = children(() => props.children)

  const isMove = createMemo(() => {
    const {parentWidth, textWidth} = dimensions()

    return Boolean(innerProps.move && parentWidth < textWidth)
  })

  const duration = createMemo(() => {
    const _move = isMove()

    if (_move) {
      const _width = dimensions().textWidth

      return (_width / HUNDRED) * (innerProps.speed ?? 1)
    }

    return 0
  })

  const measureDimensions = () => {
    setDimensions({
      parentWidth: element()?.parentElement?.clientWidth ?? 0,
      textWidth: textElement()?.getBoundingClientRect().width ?? 0,
    })
  }
  createEffect(
    on([() => innerProps.move, content], ([move]) => {
      if (move) {
        measureDimensions()
      }
    }),
  )

  const globalTarget = createMemo(() => {
    if (innerProps.move) {
      return getWindow()
    }

    return null
  })

  useEvent(() => globalTarget(), 'resize', measureDimensions)

  const style = useStyles(() => [
    {
      'animation-duration': `${duration()}s`,
    },
    innerProps.style,
  ])

  return (
    <span
      {...restProps}
      ref={setElement}
      class={rootStyle({class: innerProps.class, move: isMove()})}
      style={style()}
    >
      <span ref={setTextElement}>{content()}</span>
      <Show when={isMove()}>
        <span>{props.children}</span>
      </Show>
    </span>
  )
}
