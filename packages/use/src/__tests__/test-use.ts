import {mount} from '@vue/test-utils'
import {TriggerOptions} from '@vue/test-utils/dist/createDomEvent'
import {EmptyObject} from '@winter-love/utils'
import {TestSetup} from 'src/__tests__/test-ues.spec'
import {defineComponent, h, isRef} from 'vue-demi'

export const testUse = <Result extends Record<string, any> = EmptyObject>(
  testSetup: TestSetup<Result>,
  initProps?: Result,
) => {
  const _props = initProps ?? {}
  const Result = defineComponent(() => {
    return () => h('div')
  })

  const Component = defineComponent({
    emits: ['onToggle'],
    setup: (props) => {
      const computedValue = testSetup(props)
      return () => h(Result, Object.keys(computedValue).reduce((result, key) => {
        const value = computedValue[key]
        result[key] = isRef(value) ? value.value : value
        return result
      }, {}))
    },
  })
  const wrapper = mount(Component, {
    props: _props,
  })

  const resultWrapper = wrapper.getComponent(Result)

  return {
    result: () => {
      return resultWrapper.vm.$attrs
    },
    trigger: (eventString: string, options?: TriggerOptions) => {
      return resultWrapper.trigger(eventString, options)
    },
    wrapper: resultWrapper,
  }
}
