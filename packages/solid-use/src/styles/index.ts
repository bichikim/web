import {type JSX, type Accessor, createMemo} from 'solid-js'

export type StyleType = JSX.CSSProperties | string | undefined

export const toStringStyle = (style: JSX.CSSProperties) => {
  let result = ''

  for (const [key, value] of Object.entries(style)) {
    result += `${key}: ${value};`
  }

  return result
}

export const sx = (style: StyleType) => {
  if (typeof style === 'string' || style === undefined) {
    return style
  }

  return toStringStyle(style)
}

export const useStyles = (styles: Accessor<StyleType[] | StyleType>): Accessor<StyleType> => {
  const style = createMemo((): StyleType => {
    const _styles = styles()

    if (Array.isArray(_styles)) {
      return _styles.map(sx).join(';')
    }

    return _styles
  })

  return style
}
