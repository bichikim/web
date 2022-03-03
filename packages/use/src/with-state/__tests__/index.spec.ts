import {FunctionalComponent, h, ref} from 'vue'
import {withState} from '../'
import {mount} from '@vue/test-utils'

describe('with-state', () => {
  it('should add state for a functional component', async () => {
    interface FooProps {
      name: string
    }
    const Foo: FunctionalComponent<FooProps, ['increase']> = (props, ctx) => {
      return (
        h('div', {onClick: () => ctx.emit('increase')}, props.name)
      )
    }

    const Component = withState(Foo, () => {
      const name = ref('foo')
      const onIncrease = () => {
        name.value += '1'
      }
      return {
        name,
        onIncrease,
      }
    })

    const wrapper = mount(Component)

    expect(wrapper.get('div').text()).toBe('foo')

    await wrapper.get('div').trigger('click')

    expect(wrapper.get('div').text()).toBe('foo1')
  })
})
