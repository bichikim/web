import {createMemo, JSX, splitProps} from 'solid-js'
import {HUNDRED} from '@winter-love/utils'

export interface SScaleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 스케일 크기 */
  size?: number
}

export function SScale(props: SScaleProps) {
  const [innerProps, restProps] = splitProps(props, ['size'])

  const actualSize = createMemo(() => {
    return (innerProps.size ?? HUNDRED) / HUNDRED
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
