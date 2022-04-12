import {ref} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue'

describe('ref', () => {
  it('should run well', () => {
    const value = ref<string>('foo')
    expect(value()).toBe('foo')
    value('bar')
    expect(value()).toBe('bar')
    expect(`foo${value}`).toBe('foobar')
    expect(`${value}`).toBe('bar')
    const numberValue = ref(1)
    expect(numberValue + 1).toBe(2)
  })
  it('should run with Component', () => {
    const Component = defineComponent({
      setup() {
        return () => (
          h('div')
        )
      },
    })
  })
})
