import {defineComponent} from 'vue'
import {shallowMount} from '@vue/test-utils'

const StyledComponent = defineComponent({
  template: '<p>{{message}}</p>',
  props: ['message'],
})

describe('styled-component', function test() {
  it('should render message', function test() {
    const wrapper = shallowMount(StyledComponent, {
      props: {
        message: 'Hello world',
      },
    })

    expect(wrapper.text()).toContain('Hello world')
  })
})
