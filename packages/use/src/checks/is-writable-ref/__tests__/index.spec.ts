/**
 * @jest-environment jsdom
 */
import {computed, defineComponent, ref, toRef, toRefs} from 'vue'
import {mount} from '@vue/test-utils'
import {isWritableRef} from '../'
import {describe, expect, it} from 'vitest'

describe('isWritableRef', () => {
  it('should return true for a writable computed', () => {
    const valueRef = ref('')
    const result = isWritableRef(
      computed({
        get() {
          return valueRef.value
        },
        set(value) {
          valueRef.value = value
        },
      }),
    )

    expect(result).toBe(true)
  })
  it('should return true for a ref', () => {
    const valueRef = ref('')
    const result = isWritableRef(valueRef)

    expect(result).toBe(true)
  })
  it('should return false for computed', () => {
    const valueRef = ref('')
    const result = isWritableRef(computed(() => valueRef.value))

    expect(result).toBe(false)
  })
  it('should return false with toRefs props', () => {
    const wrapper = mount(
      defineComponent({
        props: {
          foo: {default: 'bar'},
        },
        setup(props) {
          const {foo} = toRefs(props)
          // _object
          return {
            isWritable: isWritableRef(foo),
          }
        },
      }),
    )

    const setupState = wrapper.vm.$.setupState

    expect(setupState.isWritable).toBe(false)
  })
  it('should return false with toRef props', () => {
    const wrapper = mount(
      defineComponent({
        props: {
          foo: {default: 'bar'},
        },
        setup(props) {
          const foo = toRef(props, 'foo')
          return {
            isWritable: isWritableRef(foo),
          }
        },
      }),
    )

    const setupState = wrapper.vm.$.setupState

    expect(setupState.isWritable).toBe(false)
  })
})
