/**
 * @jest-environment node
 */
import {nodeParse} from '@winter-love/vue-test'
import {renderToString} from '@vue/server-renderer'
import {createSSRApp, defineComponent, h, withDirectives} from 'vue'
import {createVueStitches} from '../'

describe('createStitches', () => {
  describe('styled', () => {
    it('should create a styled component', async () => {
      const stitches = createVueStitches({})

      const component = stitches.styled(
        'div',
        {
          color: 'red',
        },
        {
          backgroundColor: 'red',
        },
      )
      const app = createSSRApp(component)

      const result = await renderToString(app)
      const stringStyle = stitches.toString()
      const root = nodeParse(result)
      expect(root.querySelector('div')).not.toBeNull()
      expect(stringStyle).toContain('color:red')
      expect(stringStyle).toContain('background-color:red')
    })
    it('should create a styled component with a as prop', async () => {
      const stitches = createVueStitches({})

      const component = stitches.styled(
        'div',
        {
          color: 'red',
        },
        {
          backgroundColor: 'red',
        },
      )

      const app = createSSRApp(() => h(component, {as: 'span'}))

      const result = await renderToString(app)
      expect(result).toContain('<span')
      expect(stitches.toString()).toContain('color:red')
      expect(stitches.toString()).toContain('background-color:red')
    })
    it('should create a styled component and overriding styles', async () => {
      const stitches = createVueStitches({})

      const component = stitches.styled(
        'div',
        {
          color: 'red',
        },
        {
          backgroundColor: 'red',
        },
      )

      const app = createSSRApp(() => h(component, {css: {color: 'blue'}}))
      await renderToString(app)
      expect(stitches.toString()).toContain('color:red')
      expect(stitches.toString()).toContain('color:blue')
      expect(stitches.toString()).toContain('background-color:red')
    })
    it('should create a styled component with props that looks like attrs', async () => {
      const stitches = createVueStitches({})

      const system = stitches.css({
        padding: '10px',
        variants: {
          color: {
            red: {
              color: 'red',
            },
          },
        },
      })

      const component = stitches.styled('div', system, {
        backgroundColor: 'yellow',
        variants: {
          backgroundColor: {
            red: {
              backgroundColor: 'red',
            },
          },
        },
      })
      const app = createSSRApp(() => h(component, {'background-color': 'red'}))
      await renderToString(app)
      const cssString = stitches.toString()
      expect(cssString).toContain('background-color:red')
    })
    it('should create a styled component with an as prop and string tag', async () => {
      const stitches = createVueStitches({})

      const component = stitches.styled('div', {
        color: 'red',
      })

      const app = createSSRApp(() => h(component, {as: 'a'}))
      const html = await renderToString(app)
      const cssString = stitches.toString()
      expect(cssString).toContain('color:red')
      expect(html).toContain('<a class=')
    })
    it('should create a styled component with an as prop and a component', async () => {
      const stitches = createVueStitches({})

      const component = defineComponent({
        props: ['as'],
        setup: (props, {slots}) => {
          return () => h(props.as ?? 'div', {'data-foo': 'foo'}, slots.default?.())
        },
      })

      const styledComponent = stitches.styled(component, {
        color: 'red',
      })

      const app = createSSRApp(() => h(styledComponent, {as: 'a'}))
      const html = await renderToString(app)
      const root = nodeParse(html)
      const cssString = stitches.toString()
      expect(cssString).toContain('color:red')
      const target = root.querySelector('a')
      expect(target).not.toBeNull()
      expect(target?.getAttribute('data-foo')).toEqual('foo')
      expect(html).toContain('<a data-foo="foo" class=')
    })
    it('should create a styled with undefined name', () => {
      const stitches = createVueStitches({})

      const component = defineComponent({
        setup: (props, {slots}) => {
          return () => h('div', {'data-foo': 'foo'}, slots.default?.())
        },
      })

      const styledComponent = stitches.styled(component, {
        color: 'red',
      })

      expect(styledComponent.name).toBe('Styled.unknown')
    })
    it('should create a styled with a name', () => {
      const stitches = createVueStitches({})

      const component = defineComponent({
        name: 'Foo',
        setup: (props, {slots}) => {
          return () => h('div', {'data-foo': 'foo'}, slots.default?.())
        },
      })

      const styledComponent = stitches.styled(component, {
        color: 'red',
      })

      expect(styledComponent.name).toBe('Styled.Foo')
    })
  })
  describe('createDirective', () => {
    it('should create a styled directive', async () => {
      const stitches = createVueStitches({})

      const directive = stitches.createDirective(
        {
          color: 'red',
        },
        {
          backgroundColor: 'red',
        },
        {
          variants: {
            size: {
              lg: {
                width: '150px',
              },
              md: {
                width: '100px',
              },
              sm: {
                width: '50px',
              },
            },
          },
        },
      )

      const component = () => {
        return withDirectives(h('div'), [
          [directive, {size: 'sm'}],
          [directive, {height: '100px'}, 'css'],
        ])
      }
      const app = createSSRApp(component)

      await renderToString(app)

      expect(stitches.toString()).toContain('color:red')
      expect(stitches.toString()).toContain('background-color:red')
      expect(stitches.toString()).toContain('width:50px')
      expect(stitches.toString()).toContain('height:100px')
    })
  })
})
