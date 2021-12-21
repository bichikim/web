/**
 * @jest-environment jsdom
 */

import {mount} from '@vue/test-utils'
import {computed, defineComponent, h, Ref, ref, toRef} from 'vue-demi'
import {wrapRef} from '../index'
import {expectType} from 'tsd'

const setup = () => {
  const Component = defineComponent({
    props: {
      count: {default: 0, type: Number},
    },
    setup(props) {
      const countProp = toRef(props, 'count')

      const clonedCountProp = wrapRef(countProp)
      expectType<Ref<number>>(clonedCountProp)

      const count = ref(0)
      const clonedCount = wrapRef(count)
      expectType<Ref<number>>(clonedCount)
      const unbindClonedCount = wrapRef(count, {
        bindValue: false,
      })
      expectType<Ref<number>>(unbindClonedCount)
      //
      const computedCount = computed(() => {
        return count.value
      })
      const clonedComputedCount = wrapRef(computedCount)
      expectType<Ref<number>>(clonedComputedCount)

      //
      const undefinedCount = ref<number | undefined>()
      const unbindUndefinedCount = wrapRef(undefinedCount, {bindValue: false, defaultValue: 0})
      expectType<Ref<number>>(unbindUndefinedCount)
      const bindUndefinedCount = wrapRef(undefinedCount, {defaultValue: 0})
      expectType<Ref<number>>(bindUndefinedCount)
      const undefinedWrappedCount = wrapRef(undefined, {defaultValue: 0})
      expectType<Ref<number>>(undefinedWrappedCount)
      const mixType = wrapRef(10, {defaultValue: '50'})
      expectType<Ref<number | string>>(mixType)
      //

      const increaseClonedCountProp = () => {
        clonedCountProp.value += 1
      }
      const increaseCount = () => {
        count.value += 1
      }
      const increaseUnbindCount = () => {
        unbindClonedCount.value += 1
      }
      const increaseClonedCompletedCount = () => {
        clonedComputedCount.value += 1
      }
      const increaseUndefinedCount = () => {
        if (typeof undefinedCount.value === 'undefined') {
          undefinedCount.value = 0
          return
        }
        undefinedCount.value += 1
      }
      const increaseUnbindUndefinedCount = () => {
        unbindUndefinedCount.value += 1
      }

      return () => (
        h('div', [
          h('div', {id: 'clonedCountProp'}, clonedCountProp.value),
          h('div', {id: 'count'}, count.value),
          h('div', {id: 'clonedCount'}, clonedCount.value),
          h('div', {id: 'unbindClonedCount'}, unbindClonedCount.value),
          h('div', {id: 'computedCount'}, computedCount.value),
          h('div', {id: 'clonedComputedCount'}, clonedComputedCount.value),
          h('div', {id: 'undefinedCount'}, undefinedCount.value),
          h('div', {id: 'unbindUndefinedCount'}, unbindUndefinedCount.value),
          h('div', {id: 'undefinedWrappedCount'}, undefinedWrappedCount.value),
          h('div', {id: 'bindUndefinedCount'}, bindUndefinedCount.value),
          h('button', {id: 'increaseClonedCountProp', onClick: increaseClonedCountProp}, 'increase cloned count prop'),
          h('button', {id: 'increaseCount', onclick: increaseCount}, 'increase count'),
          h('button', {id: 'increaseUnbindCount', onclick: increaseUnbindCount}, 'increase count'),
          h('button', {id: 'increaseClonedCompletedCount', onclick: increaseClonedCompletedCount}, 'increase count'),
          h('button', {id: 'increaseUndefinedCount', onClick: increaseUndefinedCount}, 'increase count'),
          h('button', {id: 'increaseUnbindUndefinedCount', onClick: increaseUnbindUndefinedCount}, 'increase count'),
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
  it('should wrap a ref', () => {
    const {wrapper} = setup()

    expect(wrapper.get('#count').text()).toBe('0')
    expect(wrapper.get('#clonedCount').text()).toBe('0')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('0')
  })

  it('should update a wrapped ref', async () => {
    const {wrapper} = setup()

    await wrapper.get('#increaseCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('1')
  })

  it('should not update an Original ref if it wrapped with a bind false option', async () => {
    const {wrapper} = setup()
    expect(wrapper.get('#count').text()).toBe('0')
    expect(wrapper.get('#clonedCount').text()).toBe('0')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('0')
    await wrapper.get('#increaseCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('1')
    await wrapper.get('#increaseUnbindCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('2')
    await wrapper.get('#increaseUnbindCount').trigger('click')
    await wrapper.get('#increaseCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('2')
    expect(wrapper.get('#clonedCount').text()).toBe('2')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('2')
  })

  it('should not update an Original computed ref', async () => {
    const {wrapper} = setup()
    await wrapper.get('#increaseCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('1')
    expect(wrapper.get('#computedCount').text()).toBe('1')
    expect(wrapper.get('#clonedComputedCount').text()).toBe('1')
    await wrapper.get('#increaseClonedCompletedCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#clonedCount').text()).toBe('1')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('1')
    expect(wrapper.get('#computedCount').text()).toBe('1')
    expect(wrapper.get('#clonedComputedCount').text()).toBe('2')
    await wrapper.get('#increaseClonedCompletedCount').trigger('click')
    await wrapper.get('#increaseCount').trigger('click')
    expect(wrapper.get('#count').text()).toBe('2')
    expect(wrapper.get('#clonedCount').text()).toBe('2')
    expect(wrapper.get('#unbindClonedCount').text()).toBe('2')
    expect(wrapper.get('#computedCount').text()).toBe('2')
    expect(wrapper.get('#clonedComputedCount').text()).toBe('2')
  })
  it('should not update an Original toRef', async () => {
    const {wrapper} = setup()
    await wrapper.get('#increaseClonedCountProp').trigger('click')

    expect(wrapper.get('#clonedCountProp').text()).toBe('1')
  })
  it('should wrap ref with initState', async () => {
    const {wrapper} = setup()
    expect(wrapper.get('#undefinedCount').text()).toBe('')
    expect(wrapper.get('#bindUndefinedCount').text()).toBe('0')
    expect(wrapper.get('#undefinedWrappedCount').text()).toBe('0')

    await wrapper.get('#increaseUndefinedCount').trigger('click')
    expect(wrapper.get('#undefinedCount').text()).toBe('0')
    expect(wrapper.get('#bindUndefinedCount').text()).toBe('0')
    expect(wrapper.get('#unbindUndefinedCount').text()).toBe('0')

    await wrapper.get('#increaseUndefinedCount').trigger('click')
    expect(wrapper.get('#undefinedCount').text()).toBe('1')
    expect(wrapper.get('#bindUndefinedCount').text()).toBe('1')
    expect(wrapper.get('#unbindUndefinedCount').text()).toBe('1')

    await wrapper.get('#increaseUnbindUndefinedCount').trigger('click')
    expect(wrapper.get('#undefinedCount').text()).toBe('1')
    expect(wrapper.get('#bindUndefinedCount').text()).toBe('1')
    expect(wrapper.get('#unbindUndefinedCount').text()).toBe('2')
  })
})
