/**
 * @jest-environment jsdom
 */
import {isComponentInstance} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h, ref, watch} from 'vue'
import {describe, expect, it} from 'vitest'

describe('isComponentInstance', () => {
  it('should return true with a component', async () => {
    let _isComponentInstance
    const Component = defineComponent({
      setup() {
        return () => h('div')
      },
    })
    const Root = defineComponent({
      setup() {
        const element = ref(null)

        watch(element, (element) => {
          _isComponentInstance = isComponentInstance(element)
        })

        return () => h(Component, {ref: element})
      },
    })
    const wrapper = await mount(Root)

    expect(_isComponentInstance).toBe(true)
    expect(isComponentInstance(wrapper.element)).toBe(false)
  })
  it('should return true with functional component', async () => {
    let _isComponentInstance
    let _isElement
    const Component = () => h('div')
    const Root = defineComponent({
      setup() {
        const element = ref<any>(null)

        watch(element, (element) => {
          _isElement = element instanceof HTMLElement
          _isComponentInstance = isComponentInstance(element)
        })

        return () => h(Component, {ref: element})
      },
    })
    const wrapper = await mount(Root)

    expect(_isComponentInstance).toBe(false)
    expect(_isElement).toBe(true)
    expect(isComponentInstance(wrapper.element)).toBe(false)
  })
})
