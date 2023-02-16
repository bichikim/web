/**
 * @jest-environment jsdom
 */
import {defineComponent, flushPromises, h, mount, watch} from '@winter-love/vue-test'
import {ref} from 'vue'
import {resolveElementRef} from '../'

describe('resolveElementRef', () => {
  it('should resolve element ref', () => {
    const element = document.createElement('div')
    expect(resolveElementRef(element).value).toEqual(element)
  })
  it('should resolve element ref', async () => {
    let elementResult
    const Component = defineComponent(() => {
      return () => h('div', 'hello')
    })
    const Component2 = defineComponent(() => {
      return () => h(Component)
    })
    const Root = defineComponent(() => {
      const elementRef = ref(null)
      const element = resolveElementRef(elementRef)

      watch(element, (element) => {
        elementResult = element
      })

      return () => h(Component2, {ref: elementRef})
    })
    mount(Root)
    await flushPromises()
    expect(elementResult).toBeInstanceOf(HTMLElement)
  })
})
