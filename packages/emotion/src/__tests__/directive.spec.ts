import {createDirective} from '../directive'
import createEmotionOriginal from '@emotion/css/create-instance'
import {mount} from '@vue/test-utils'
import {h, withDirectives} from 'vue'

describe('directive', () => {
  it('should ', async () => {
    const directive = createDirective(createEmotionOriginal({key: 'css'}))

    const Component = (props) => {
      return withDirectives(h('div'), [
        [directive, {width: props.width}],
      ])
    }

    Component.props = ['width']

    const wrapper = mount(Component)

    await wrapper.setProps({
      width: 50,
    })

    expect(wrapper.element).toHaveStyle({
      width: '50px',
    })
  })
})
