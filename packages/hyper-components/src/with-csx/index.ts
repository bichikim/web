import {Component, EmitsOptions, FunctionalComponent, h} from 'vue-demi'
import {HyperProps, useCsx} from '../'

// eslint-disable-next-line @typescript-eslint/ban-types
type EmptyObject = {}

export const withCsx = <Props = EmptyObject,
  Emit extends EmitsOptions = EmptyObject,
  >(component: Component<Props>, name: string = 'Cxs'): FunctionalComponent<Props & HyperProps, Emit> => {
  const wrapper = {
    [name]: (_, {attrs, slots}) => {
      const csx = useCsx()
      return (
        h(component, csx(attrs as any), slots)
      )
    },
  }
  return wrapper[name]
}
