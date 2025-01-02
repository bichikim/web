/**
 * @jest-environment jsdom
 */
import {mount} from '@vue/test-utils'
import {defineComponent, h, onMounted, ref} from 'vue'
import {resolveElement} from '../'
import {describe, expect, it} from 'vitest'

describe('resolveElement', () => {
  it('should not get element with none element', () => {
    const result = resolveElement({} as any)

    expect(result).toBeNull()
  })
  it('should get element from ref', () => {
    const element = document.createElement('div')
    const result = resolveElement(element)

    expect(result).toBe(element)
  })
  it('should get element from ref', () => {
    let result
    const ComponentElement = defineComponent({
      name: 'ComponentElement',
      props: {},
      setup() {
        return () => h('div')
      },
    })
    const component = defineComponent({
      setup() {
        const elementRef = ref()

        onMounted(() => {
          result = resolveElement(elementRef.value)
        })

        return () => h(ComponentElement as any, {ref: elementRef})
      },
    })

    mount(component)
    expect(result).toBeInstanceOf(HTMLElement)
  })
})
