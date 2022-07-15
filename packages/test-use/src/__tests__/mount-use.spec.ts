import {flushPromises} from '@vue/test-utils'
import {ref, toRef} from 'vue'
import {mountUse} from '../mount-use'

describe('test-use', () => {
  it('should test', async () => {
    const {result} = mountUse(() => {
      const countRef = ref(0)
      return {
        count: countRef,
        foo: 'foo',
        toggle: (add) => {
          countRef.value += add
        },
      }
    })

    expect(result.foo).toBe('foo')
    expect(result.count).toBe(0)
    await result.toggle(2)
    await flushPromises()

    expect(result.count).toBe(2)
  })
  it('should test with props', () => {
    const {result} = mountUse(
      (props) => {
        const countProp = toRef(props, 'count')
        const countRef = ref(countProp.value)
        return {
          count: countRef,
          foo: 'foo',
          toggle: (add) => {
            countRef.value += add
          },
        }
      },
      {count: 2},
    )

    expect(result.foo).toBe('foo')
    expect(result.count).toBe(2)
  })
})
