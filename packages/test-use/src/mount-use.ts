import {mount} from '@vue/test-utils'
import {EmptyObject} from '@winter-love/utils'
import {upperFirst} from 'lodash'
import {defineComponent, h, isRef} from 'vue-demi'

export type TestSetup<Props extends Record<string, any>, Result extends Record<string, any>> = (
  props: Props,
) => Result

const eventName = (value: string): string => {
  return `on${upperFirst(value)}`
}

/**
 * @deprecated
 * @param testSetup
 * @param initProps
 */
export const mountUse = <
  Props extends Record<string, any>,
  Result extends Record<string, any> = EmptyObject,
>(
  testSetup: TestSetup<Props, Result>,
  initProps?: Props,
) => {
  const _props = initProps ?? {}
  const Result = defineComponent(() => {
    return () => h('div')
  })

  const Component = defineComponent({
    emits: ['onToggle'],
    setup: (props: any) => {
      const computedValue = testSetup(props)
      return () => {
        const {props, handles} = Object.keys(computedValue).reduce(
          (result, key) => {
            const value = computedValue[key]
            if (typeof value === 'function') {
              const name = eventName(key)
              result.props[name] = ({args = []}) => value(...args)
              result.handles[key] = true
              return result
            }
            result.props[key] = isRef(value) ? value.value : value
            return result
          },
          {handles: {}, props: {}},
        )

        return h(Result, {...props, __handles: handles})
      }
    },
  })
  const wrapper = mount(Component, {
    props: _props,
  })

  const resultWrapper = wrapper.getComponent(Result)

  const result: Result = new Proxy(
    {},
    {
      get(target, name: string) {
        const attrs = resultWrapper.vm.$attrs
        const {__handles, ...rest} = attrs
        const handles: Record<string, boolean> = __handles as any
        const isHandle = handles[name]

        if (isHandle) {
          return (...args) => {
            return resultWrapper.trigger(name, {args})
          }
        }
        return Reflect.get(rest, name, rest)
      },
    },
  ) as any

  return {
    result,
    wrapper: resultWrapper,
  }
}
