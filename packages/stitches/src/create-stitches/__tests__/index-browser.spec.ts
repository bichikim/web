/**
 * @jest-environment jsdom
 */
import {mount} from '@winter-love/test-utils'
import {h, withDirectives} from 'vue'
import {createVueStitches} from '../'

describe('createVueStitches', () => {
  it('should render styled component', () => {
    const stitches = createVueStitches({})
    const component = stitches.styled('div', {
      color: 'red',
      variants: {
        size: {
          md: {
            width: '50px',
          },
          sm: {
            width: '20px',
          },
        },
      },
    })
    const wrapper = mount(component, {
      attrs: {
        test: 'yes',
      },
      props: {
        size: 'md',
      },
      slots: {
        default: () => 'hello world',
      },
    })
    expect(wrapper.get('div').isVisible()).toBe(true)
    expect(wrapper.get('div').text()).toBe('hello world')
    expect(wrapper.get('div').attributes('test')).toBe('yes')
    expect(wrapper.get('div').attributes('size')).toBeUndefined()
    // todo need to find test style
    // console.log(document.querySelectorAll('style')[0].textContent)
    // console.log(stitches.getCssText())
  })
  it('should render directive', async () => {
    const stitches = createVueStitches({})

    const styleDirective = stitches.createDirective({
      color: 'red',
    })

    const component = (props) => {
      return withDirectives(h('div'), [[styleDirective, {bg: props.bg ?? 'blue'}, 'css']])
    }

    const wrapper = mount(component)

    expect(wrapper.get('div').isVisible()).toBe(true)
    const className = wrapper.get('div').classes()[1]
    expect(wrapper.get('div').classes().length).toBe(2)

    await wrapper.setProps({
      bg: 'ref',
    })

    expect(wrapper.get('div').isVisible()).toBe(true)
    expect(wrapper.get('div').classes().length).toBe(2)
    expect(wrapper.get('div').classes()[1]).not.toBe(className)
  })
})
