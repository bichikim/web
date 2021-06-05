import {Props, PropsObject} from '../types'

export const toObjectProps = <T, D = T>(props: Props<T, D>): PropsObject<T, D> => {
  if (Array.isArray(props)) {
    return props.reduce((result: Record<any, any>, value: any) => {
      result[value] = null
      return result
    }, {})
  }
  return props
}
