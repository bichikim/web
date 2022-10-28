/**
 * @jest-environment jsdom
 */
import {computed, mountComposition, ref, toRef, toRefs} from '@winter-love/vue-test'
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
  it('should return false with props', () => {
    const wrapper = mountComposition(
      (props) => {
        // const name = toRef(props, 'foo')
        const {foo} = toRefs(props)
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
  it('should return false with toRef of props', () => {
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
