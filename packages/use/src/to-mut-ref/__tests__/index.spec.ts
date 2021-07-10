import {toMutRef} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue-demi'

const setup = (foo: string) => {
  const Component = defineComponent({
    props: ['foo'],
    setup(props) {
      const mutRef = toMutRef(props, 'foo')

      const setMut = () => {
        mutRef.value += '1'
      }

      return () => (
        h('div', [
          h('div', {id: 'text'}, mutRef.value),
          h('button', {id: 'button', onclick: setMut}, 'add'),
        ])
      )
    },
  })

  const wrapper = mount(Component, {
    props: {foo},
  })

  return {
    wrapper,
  }
}

describe('to-mut-ref', () => {
  it('should change ref', async () => {
    const {wrapper} = setup('foo')

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
