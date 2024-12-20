/**
 * @jest-environment jsdom
 */
import {computed, isReadonly, reactive, toRef} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'

describe('isReadonly', () => {
  it('should return true with reactive', () => {
    expect(isReadonly(reactive({name: 'foo'}))).toBe(false)
  })
  it('should return false with reactive', () => {
    expect(isReadonly(reactive({name: 'foo'}))).toBe(false)
  })
  it('should return ture with computed', () => {
    expect(isReadonly(computed(() => 'foo'))).toBe(true)
  })
  it('should return false with writeable computed', () => {
    const _value = {value: 'foo'}
    expect(
      isReadonly(
        computed({
          get: () => _value.value,
          set: () => _value.value,
        }),
      ),
    ).toBe(false)
  })
  it('should return false with toRef props', () => {
    const wrapper = mount(
      {
        props: {name: null},
        render: () => null,
        setup(props) {
          const result = isReadonly(toRef(props, 'name'))
          return {
            result,
          }
        },
      },
      {
        props: {
          name: 'foo',
        },
      },
    )
    expect(wrapper.vm.result).toBe(false)
  })
  it('should return false with toRef props', () => {
    const wrapper = mount(
      {
        props: {name: null},
        render: () => null,
        setup(props) {
          const result = isReadonly(props)
          return {
            result,
          }
        },
      },
      {
        props: {
          name: 'foo',
        },
      },
    )
    expect(wrapper.vm.result).toBe(true)
  })
})
