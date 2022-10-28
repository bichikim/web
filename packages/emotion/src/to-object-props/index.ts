import {Props, PropsObject} from '@winter-love/use'

export const toObjectProps = <T, D = T>(props: Props<T, D>): PropsObject<string, T, D> => {
  if (Array.isArray(props)) {
    return Object.fromEntries(
      props.map((key) => {
        return [key, null]
      }),
    )
  }
  return props as PropsObject<string, T, D>
}
