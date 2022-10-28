import {Props, PropsObject} from '@winter-love/use'
import {toObjectProps} from '../to-object-props'

export const margeProps = <T, D = T>(
  props: Props,
  defaultProps?: Props,
): PropsObject<string, T, D> => {
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
