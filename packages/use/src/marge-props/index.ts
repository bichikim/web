import {Props, PropsObject} from '../types'
import {toObjectProps} from '../to-object-props'

export const margeProps = <T, D = T>(props: Props, defaultProps?: Props): PropsObject<T, D> => {
  const _props = toObjectProps(props)
  if (!defaultProps) {
    return _props
  }
  const _defaultProps = toObjectProps(defaultProps)

  return {
    ..._defaultProps,
    ..._props,
  }
}
