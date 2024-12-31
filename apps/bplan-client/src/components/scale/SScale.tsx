import {createMemo, JSX, splitProps} from 'solid-js'

export interface SScaleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 스케일 크기 */
  size?: number
}

export function SScale(props: SScaleProps) {
  const [innerProps, restProps] = splitProps(props, ['size'])

  const scaleStyle = createMemo(() => {
    return {
      transform: `scale(${innerProps.size ?? 1})`,
    }
  })

  return (
    <div {...restProps} style={scaleStyle()}>
      {restProps.children}
    </div>
  )
}
