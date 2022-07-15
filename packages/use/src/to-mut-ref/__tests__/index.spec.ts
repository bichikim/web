import {mount} from '@vue/test-utils'
import {defineComponent, h, reactive, toRef} from 'vue-demi'
import {toMutRef} from '../'

describe('to-mut-ref', () => {
  it('should change ref', async () => {
    const foo = 'foo'
    const Component = defineComponent({
      props: ['foo'],
      setup(props) {
        const mutRef = toMutRef(props, 'foo')
        const setMut = () => {
          mutRef.value += '1'
        }

        return () =>
          h('div', [
            h('div', {id: 'text'}, mutRef.value),
            h('button', {id: 'button', onClick: setMut}, 'add'),
          ])
      },
    })

    const wrapper = mount(Component, {
      props: {foo},
    })

    expect(wrapper.get('#text').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#text').text()).toBe('foo1')

    await wrapper.setProps({
      foo: 'bar',
    })

    expect(wrapper.get('#text').text()).toBe('bar')

    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#text').text()).toBe('bar1')

    await wrapper.setProps({
      foo: 'john',
    })

    expect(wrapper.get('#text').text()).toBe('john')

    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#text').text()).toBe('john1')

    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#text').text()).toBe('john11')
  })
})

describe('to-ref', () => {
  it('should change ref', () => {
    const state = reactive({
      bar: 'bar',
      foo: 'foo',
    })
    const foo = toRef(state, 'foo')
    expect(foo.value).toBe('foo')
    foo.value = 'foo1'
    expect(foo.value).toBe('foo1')
    expect(state.foo).toBe('foo1')
  })
})
