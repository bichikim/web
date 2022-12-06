/**
 * @jest-environment jsdom
 */
import {mountProvide} from '../'
import {inject, provide, toRef} from 'vue'

describe('mountProvide', () => {
  it('should render context', async () => {
    const key = 'foo'
    const wrapper = mountProvide({
      inject: () => {
        return inject(key)
      },
      props: {
        foo: 'foo',
      },
      propsOptions: ['foo'],
      provide: (props) => {
        const foo = toRef(props, 'foo')
        provide(key, foo)
        return foo
      },
    })
    expect(wrapper.setupState.inject).toBe('foo')
    expect(wrapper.setupState.provide).toBe('foo')
    await wrapper.setProps({
      foo: 'bar',
    })
    expect(wrapper.setupState.inject).toBe('bar')
    expect(wrapper.setupState.provide).toBe('bar')
  })
})
