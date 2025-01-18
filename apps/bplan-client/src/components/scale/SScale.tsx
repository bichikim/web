import {createMemo, JSX, splitProps} from 'solid-js'
import {HUNDRED} from '@winter-love/utils'

export interface SScaleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  minSize?: number
  /** 스케일 크기 */
  size?: number
}

export function SScale(props: SScaleProps) {
  const [innerProps, restProps] = splitProps(props, ['size', 'minSize'])

  const actualSize = createMemo(() => {
    const _minSize = innerProps.minSize ?? 0

    const range = HUNDRED - _minSize

    const _size = innerProps.size ?? HUNDRED

    return (range * (_size / HUNDRED) + _minSize) / HUNDRED
  })
  const scaleStyle = createMemo(() => {
    return {
      transform: `scale(${actualSize()})`,
      // just send resizing signal for the browser rendering engine
      width: `${actualSize()}%`,
    }
  })

  return (
    <div {...restProps} style={scaleStyle()}>
      {restProps.children}
    </div>
  )
}
