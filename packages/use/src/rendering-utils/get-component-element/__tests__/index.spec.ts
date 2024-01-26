/**
 * @jest-environment jsdom
 */
import {mount} from '@vue/test-utils'
import {defineComponent, h, onMounted, ref} from 'vue'
import {getComponentElement} from '../'

describe('getRefElement', () => {
  it('should not get element with none element', () => {
    const result = getComponentElement({} as any)
    expect(result).toBeNull()
  })
  it('should get element from ref', () => {
    const element = document.createElement('div')
    const result = getComponentElement(element)
    expect(result).toBe(element)
  })
  it('should get element from ref', () => {
    let result
    const ComponentElement = defineComponent({
      name: 'ComponentElement',
      setup() {
        return () => h('div')
      },
    })
    const component = defineComponent({
      name: '',
      setup() {
        const elementRef = ref()

        onMounted(() => {
          result = getComponentElement(elementRef.value)
        })

        return () => h(ComponentElement, {ref: elementRef})
      },
    })
    mount(component)
    expect(result).toBeInstanceOf(HTMLElement)
  })
})
