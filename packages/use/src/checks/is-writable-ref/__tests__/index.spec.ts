/**
 * @jest-environment jsdom
 */
import {computed, mountComposition, ref, toRef, toRefs} from '@winter-love/test-utils'
import {isWritableRef} from '../'

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
    const wrapper = mountComposition(
      (props) => {
        const {foo} = toRefs(props)
        // _object
        return {
          isWritable: isWritableRef(foo),
        }
      },
      {
        props: {
          foo: 'bar',
        },
      },
    )

    expect(wrapper.setupState.isWritable).toBe(false)
  })
  it('should return false with toRef props', () => {
    const wrapper = mountComposition(
      (props) => {
        const foo = toRef(props, 'foo')
        return {
          isWritable: isWritableRef(foo),
        }
      },
      {
        props: {
          foo: 'bar',
        },
      },
    )

    expect(wrapper.setupState.isWritable).toBe(false)
  })
})
