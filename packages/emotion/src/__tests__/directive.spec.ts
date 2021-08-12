import createEmotionOriginal from '@emotion/css/create-instance'
import {mount} from '@vue/test-utils'
import {h, withDirectives} from 'vue'
import {createDirective} from '../directive'

describe('directive', () => {
  it('should ', async () => {
    const theme = {
      sizes: {
        md: '50px',
      },
    }

    const directive = createDirective(createEmotionOriginal({key: 'css'}))

    directive.setTheme(theme)
    directive.setSystem((props: any) => {
      const {theme, width, ...rest} = props

      return {
        ...rest,
        width: theme.sizes[width] ?? width,
      }
    })

    {
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
    }

    {
      const Component = (props) => {
        return withDirectives(h('div'), [
          [directive, {width: props.width}, 'system'],
        ])
      }

      Component.props = ['width']

      const wrapper = mount(Component)

      await wrapper.setProps({
        width: 'md',
      })

      expect(wrapper.element).toHaveStyle({
        width: '50px',
      })
    }

  })
})
