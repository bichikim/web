/**
 * @jest-environment jsdom
 */
import {debug} from '../'
import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'

jest.mock('../', () => {
  process.env.NODE_ENV = 'production'
  const actual = jest.requireActual('../')
  return {
    ...actual,
  }
})

describe('debug', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })
  it('should not debug', () => {
    const Component = defineComponent({
      setup() {
        const name = ref('foo')
        debug({
          name,
        })
        return () => h('div', name.value)
      },
    })
    const wrapper = mount(Component)
    expect(wrapper.get('div').text()).toBe('foo')
    expect(wrapper.vm.$.setupState).toEqual({})
  })
})
