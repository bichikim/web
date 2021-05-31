import {MayRef} from '@/types'
import {wrapRef} from '../index'
import {h, defineComponent, ref} from 'vue'
import {mount} from '@vue/test-utils'

const setup = () => {
  const useHook = <T>(value: MayRef<T>) => {
    return wrapRef(value)
  }

  const Component = defineComponent({
    setup() {
      const count = ref(0)
      const clonedCount = wrapRef(count)
      const hookCount = useHook(count)
      const increaseCount = () => {
        count.value += 1
      }
      return () => (
        h('div', [
          h('div', {id: 'count'}, count.value),
          h('div', {id: 'clonedCount'}, clonedCount.value),
          h('div', {id: 'hookCount'}, hookCount.value),
          h('button', {id: 'increaseCount', onclick: increaseCount}, 'increase count'),
        ])
      )
    },
  })

  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

describe('wrap-ref', () => {
  it('should wrap ref', async () => {
    const {wrapper} = setup()

    expect(wrapper.get('#count').text()).toBe('0')
    expect(wrapper.get('#clonedCount').text()).toBe('0')
    expect(wrapper.get('#hookCount').text()).toBe('0')

    await wrapper.get('#increaseCount').trigger('click')

    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#hookCount').text()).toBe('1')
  })
})
