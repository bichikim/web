/**
 * @jest-environment jsdom
 */
import {mountComposition} from '@winter-love/test-utils'
import {computed, ref, toRef} from 'vue'
import {isToRef} from '../'

describe('isToRef', () => {
  it('should be ref', () => {
    const wrapper = mountComposition(
      (props) => {
        const fooProp = toRef(props, 'foo')
        const bar = ref('bar')
        const john = computed(() => 'john')
        return {
          isBar: isToRef(bar),
          isFoo: isToRef(fooProp),
          isJohn: isToRef(john),
        }
      },
      {
        props: {
          foo: {default: '', type: String},
        },
      },
    )

    expect(wrapper.setupState.isFoo).toEqual(true)
    expect(wrapper.setupState.isBar).toEqual(false)
    expect(wrapper.setupState.isJohn).toEqual(false)
  })
})
