import {MayRef} from 'src/types'
import {wrapRef} from '../index'
import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'

const setup = () => {
  const useHook = <T>(value: MayRef<T>) => {
    return wrapRef(value)
  }

  const Component = defineComponent({
    setup() {
      const count = ref(0)
      const clonedCount = wrapRef(count)
      const unBindClonedCount = wrapRef(count, {
        bindValue: false,
      })
      const undefinedCount = ref<number | undefined>()
      const clonedUndefinedCount = wrapRef(undefinedCount, {bindValue: false, initState: 0})
      const bindClonedUndefinedCount = wrapRef(undefinedCount, {initState: 0})
      const undefinedWrappedCount = wrapRef<undefined | number>(undefined, {initState: 0})
      const hookCount = useHook(count)
      const increaseCount = () => {
        count.value += 1
      }
      const unbindIncreaseCount = () => {
        unBindClonedCount.value += 1
      }
      const increaseUndefinedCount = () => {
        if (typeof undefinedCount.value === 'undefined') {
          undefinedCount.value = 0
          return
        }
        undefinedCount.value += 1
      }
      return () => (
        h('div', [
          h('div', {id: 'count'}, count.value),
          h('div', {id: 'clonedCount'}, clonedCount.value),
          h('div', {id: 'unBindClonedCount'}, unBindClonedCount.value),
          h('div', {id: 'hookCount'}, hookCount.value),
          h('div', {id: 'undefinedCount'}, undefinedCount.value),
          h('div', {id: 'clonedUndefinedCount'}, clonedUndefinedCount.value),
          h('div', {id: 'undefinedWrappedCount'}, undefinedWrappedCount.value),
          h('div', {id: 'bindClonedUndefinedCount'}, bindClonedUndefinedCount.value),
          h('button', {id: 'increaseCount', onclick: increaseCount}, 'increase count'),
          h('button', {id: 'unbindIncreaseCount', onclick: unbindIncreaseCount}, 'unbindIncrease count'),
          h('button', {id: 'increaseUndefinedCount', onClick: increaseUndefinedCount}, 'increase undefined count'),
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
    expect(wrapper.get('#unBindClonedCount').text()).toBe('0')

    await wrapper.get('#increaseCount').trigger('click')

    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#hookCount').text()).toBe('1')
    expect(wrapper.get('#unBindClonedCount').text()).toBe('0')

    await wrapper.get('#unbindIncreaseCount').trigger('click')

    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#hookCount').text()).toBe('1')
    expect(wrapper.get('#unBindClonedCount').text()).toBe('1')

    expect(wrapper.get('#undefinedCount').text()).toBe('')
    expect(wrapper.get('#bindClonedUndefinedCount').text()).toBe('0')
    await wrapper.get('#increaseUndefinedCount').trigger('click')
    expect(wrapper.get('#undefinedCount').text()).toBe('0')
    expect(wrapper.get('#clonedUndefinedCount').text()).toBe('0')
    expect(wrapper.get('#undefinedWrappedCount').text()).toBe('0')
    expect(wrapper.get('#bindClonedUndefinedCount').text()).toBe('0')
    await wrapper.get('#increaseUndefinedCount').trigger('click')
    expect(wrapper.get('#undefinedCount').text()).toBe('1')
    expect(wrapper.get('#bindClonedUndefinedCount').text()).toBe('1')
    expect(wrapper.get('#clonedUndefinedCount').text()).toBe('0')
    expect(wrapper.get('#undefinedWrappedCount').text()).toBe('0')
  })
})
