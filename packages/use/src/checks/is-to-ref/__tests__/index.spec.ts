/**
 * @jest-environment jsdom
 */
import {mount} from '@vue/test-utils'
import {computed, defineComponent, ref, toRef} from 'vue'
import {isToRef} from '../'
import {describe, expect, it} from 'vitest'

describe('isToRef', () => {
  it('should be ref', () => {
    const wrapper = mount(
      defineComponent({
        props: {
          foo: {default: '', type: String},
        },
        setup(props) {
          const fooProp = toRef(props, 'foo')
          const bar = ref('bar')
          const john = computed(() => 'john')
          return {
            isBar: isToRef(bar),
            isFoo: isToRef(fooProp),
            isJohn: isToRef(john),
          }
        },
      }),
    )

    const setupState = wrapper.vm.$.setupState

    expect(setupState.isFoo).toEqual(true)
    expect(setupState.isBar).toEqual(false)
    expect(setupState.isJohn).toEqual(false)
  })
})
