/**
 * @jest-environment jsdom
 */
import {flushPromises} from '@vue/test-utils'
import {ref, toRef} from 'vue'
import {mountComposition} from '../'

describe('test-use', () => {
  it('should test', async () => {
    const {setupState} = mountComposition(() => {
      const countRef = ref(0)
      return {
        count: countRef,
        foo: 'foo',
        toggle: (add) => {
          countRef.value += add
        },
      }
    })

    expect(setupState.foo).toBe('foo')
    expect(setupState.count).toBe(0)
    await setupState.toggle(2)
    await flushPromises()

    expect(setupState.count).toBe(2)
  })
  it('should test with props', () => {
    const {setupState} = mountComposition(
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
      {
        props: {
          count: 2,
        },
      },
    )
    expect(setupState.foo).toBe('foo')
    expect(setupState.count).toBe(2)
  })
})
