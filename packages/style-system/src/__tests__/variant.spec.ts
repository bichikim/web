/**
 * @jest-environment jsdom
 */

import {createVariant} from '../variant'
import {system} from '../system'
import {createEmotion, Theme} from '@winter-love/emotion'
import {mount} from '@vue/test-utils'
import {h} from 'vue-demi'

const theme: Theme = {
  breakpoints: ['500px', '750px', '1200px'],
  space: {
    lg: '15px',
    md: '10px',
    sm: '5px',
  },
}

const emotion = createEmotion({theme})

const themeVariants = {
  ...theme,
  variants: {
    deep: {
      '&>div': {
        '.foo': {
          padding: 'sm',
        },
        margin: 'sm',
      },
      margin: 'lg',
      padding: 'md',
    },
    lg: {
      margin: 'lg',
      padding: 'md',
    },
    md: {
      margin: 'lg',
      padding: 'sm',
    },
    sm: {
      margin: 'sm',
      padding: 'sm',
    },
  },
}

const systems = system({
  margin: {
    scale: 'space',
  },
  padding: {
    scale: 'space',
  },
})

const setup = () => {
  return createVariant(systems)
}

describe('variant', () => {
  it('should return styles', () => {
    const variant = setup()

    const variantParse = variant({
      prop: 'variant',
      scale: 'variants',
      variants: {
        lg: {
          margin: 'lg',
          padding: 'lg',
        },
      },
    })

    const Component = emotion.styled('div', {
      stylePortal: 'css',
    })(variantParse, () => {
      return {}
    })

    const wrapper = mount(Component, {
      props: {css: {foo: 'bar', variant: 'lg'}},
    })

    expect(wrapper.element).toHaveStyle({
      margin: '15px',
      padding: '15px',
    })
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'md',
      })

      expect(result).toEqual({
        margin: '15px',
        padding: '5px',
      })
    }
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'sm',
      })

      expect(result).toEqual({
        margin: '5px',
        padding: '5px',
      })
    }
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'foo',
      })

      expect(result).toEqual({})
    }
    {
      const result = variantParse({
        theme,
        variant: 'lg',
      })

      expect(result).toEqual({
        margin: '15px',
        padding: '15px',
      })
    }
  })
  it('should not return styles', () => {
    const variant = setup()

    const variantParse = variant({
      prop: 'variant',
      scale: 'variants',
    })

    {
      const result = variantParse({
        theme,
        variant: 'lg',
      })

      expect(result).toEqual({})
    }
  })
  it.skip('should not return styles', () => {
    const variant = setup()

    const variantParse = variant({
      prop: 'variant',
      scale: 'variants',
    })

    const Component = emotion.styled('div', {
      stylePortal: 'css',
    })(
      variantParse,
      systems,
    )

    const Component2 = (props) => {
      return h(Component, props, () => [
        h('div', {class: 'bar'}, [
          h('div', {class: 'foo'}),
        ]),
      ])
    }

    const wrapper = mount(Component2, {
      props: {css: {margin: 'sm', variant: 'deep'}, theme: themeVariants},
    })

    expect(wrapper.element).toMatchSnapshot()

    expect(wrapper.element).toHaveStyle({
      margin: '5px',
      padding: '10px',
    })

    expect(wrapper.get('.bar').element).toHaveStyle({
      margin: '5px',
    })

    expect(wrapper.get('.foo').element).toHaveStyle({
      padding: '5px',
    })
  })
})
