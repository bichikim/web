import {computed, FunctionalComponent, h, ref, toRefs} from 'vue-demi'
import {withState} from '../'
import {mount} from '@vue/test-utils'

describe('with-state', () => {
  it('should add state for a functional component', async () => {
    interface FooProps {
      name: string
    }
    const Foo: FunctionalComponent<FooProps, ['increase']> = (props, ctx) => {
      return h('div', {onClick: () => ctx.emit('increase')}, props.name)
    }

    const Component = withState(Foo, {
      emits: ['hello'],
      props: {
        age: {type: Number},
      },
      setup: (props, {emit}) => {
        const {age: argRef} = toRefs(props)
        const name = ref('foo')
        const onIncrease = () => {
          name.value += '1'
          emit('hello', name.value)
        }
        const ageAndName = computed(() => {
          const arg = argRef?.value
          if (!arg) {
            return name.value
          }
          return `${name.value}-${arg}`
        })
        return {
          name: ageAndName,
          onIncrease,
        }
      },
    })

    const wrapper = mount(Component, {
      props: {
        age: 5,
      },
    })

    expect(wrapper.get('div').text()).toBe('foo-5')

    await wrapper.get('div').trigger('click')

    expect(wrapper.get('div').text()).toBe('foo1-5')
  })
})
