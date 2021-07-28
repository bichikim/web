import {
  createEmotion, createStyled, EMOTION_CACHE_CONTEXT, EMOTION_THEME_CONTEXT, StyledFunctionalComponent, StyledOptions,
} from '../'
import createEmotionOriginal from '@emotion/css/create-instance'
import {mount} from '@vue/test-utils'
import {
  createApp, defineComponent, h,
} from 'vue-demi'

describe('emotion', () => {
  describe('createStyled', () => {
    interface Options extends StyledOptions {
      element?: any
      props?: any
      slot?: any
    }

    const setup = (options: Options = {}) => {
      const {slot, element = 'div', props = {}, ...rest} = options
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const StyledComponent = styled(element, {
        props: {
          color: {type: String},
          height: {type: String},
          width: null,
        },
        ...rest,
      })({
        backgroundColor: 'red',
      }, (props) => {
        return {
          color: props.color,
        }
      })

      const Component = defineComponent({
        setup: (_, {slots}) => {
          return () => (
            h(StyledComponent, () => slots.default?.())
          )
        },
      })

      const wrapper = mount(Component, {props: {...props, color: 'red'}, slots: {default: () => slot}})

      return {
        Component,
        StyledComponent,
        wrapper,
      }
    }

    it('should render css and a string element', () => {
      const {wrapper} = setup()
      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
      })
    })

    it('should render attributes', () => {
      const {wrapper} = setup({props: {id: 'foo'}})

      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
        color: 'red',
      })
      expect(wrapper.element).toHaveAttribute('id', 'foo')
    })

    it('should render attributes', () => {
      const {wrapper} = setup({props: {css: {color: 'red'}, id: 'foo'}, stylePortal: 'css'})

      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
        color: 'red',
      })
      expect(wrapper.element).toHaveAttribute('id', 'foo')
    })

    it('should render a Vue Component', () => {
      const Component = defineComponent({
        setup() {
          return () => (
            h('div', 'vue-component')
          )
        },
      })

      const {wrapper} = setup({element: Component})

      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
      })

      expect(wrapper.get('div').text()).toBe('vue-component')
    })

    it('should render label', () => {
      const {wrapper} = setup({
        label: 'test',
      })
      expect(wrapper.get('div').classes()[0]).toMatch(/test$/u)
    })

    it('should render props', async () => {
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const Component = styled('div', {
        props: {
          color: {default: 'red', type: String},
        },
      })(
        ({color}: any) => {
          return {
            color,
          }
        },
      )

      const wrapper = mount(Component)

      expect(wrapper.get('div').element).toHaveStyle({
        color: 'red',
      })

      await wrapper.setProps({
        color: 'blue',
      })
      expect(wrapper.get('div').element).toHaveStyle({
        color: 'blue',
      })
      expect(wrapper.element).not.toHaveAttribute('color')
    })

    it('should have a name', () => {
      const {StyledComponent} = setup({
        name: 'foo',
      })
      expect(StyledComponent.name).toBe('foo')
      expect(StyledComponent.displayName).toBe('foo')
    })

    it('should pass styleProps with a component element by default', () => {
      const Component = defineComponent(() => {
        return () => h('div')
      })
      const {wrapper} = setup({
        element: Component,
      })

      expect(wrapper.get('div').attributes()).toEqual(expect.objectContaining({color: 'red'}))
    })

    it('should not pass styleProps with the inheritStyleProps false', () => {
      const Component = defineComponent(() => {
        return () => h('div')
      })
      const {wrapper} = setup({element: Component, inheritStyleProps: false})
      expect(wrapper.get('div').attributes()).not.toEqual(expect.objectContaining({color: 'red'}))
    })

    it('should use a label instead of the name', () => {
      const {StyledComponent} = setup({
        label: 'bar',
      })
      expect(StyledComponent.name).toBe('bar')
      expect(StyledComponent.displayName).toBe('bar')
    })

    it('should use name for label with label = true', () => {
      const {wrapper} = setup({
        label: true,
        name: 'bar',
      })

      expect(wrapper.classes()[0]).toMatch(/-bar$/u)
    })

    it('should use the name "emotion" if it does not have name and label ', () => {
      const {StyledComponent} = setup()
      // expect(StyledComponent.name).toBe('emotion')
      expect(StyledComponent.displayName).toBe('emotion')
    })

    it('should render an empty slot', () => {
      const {wrapper} = setup()
      expect(wrapper.get('div').text()).toBe('')
    })

    it('should render a slot', () => {
      const {wrapper} = setup({slot: 'foo'})
      expect(wrapper.get('div').text()).toBe('foo')
    })

    it('should style a component with a slot', () => {
      const MyComponent = defineComponent((_, {slots}) => {
        return () => (
          h('div', slots.default?.())
        )
      })
      const {wrapper} = setup({element: MyComponent, slot: 'foo'})
      expect(wrapper.get('div').text()).toBe('foo')
      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
      })
    })

    it('should add css by the target', () => {
      const {wrapper} = setup({
        target: 'foo',
      })

      expect(wrapper.get('div').element).toHaveClass('foo')
    })

    it('should style a component by a stylePortal', () => {
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const Component = styled('div', {
        props: {
          css: {default: () => ({}), type: Object},
        },
        stylePortal: 'css',
      })(
        ({color}: any) => {
          return {
            color,
          }
        },
      )

      const wrapper = mount(Component, {
        props: {
          css: {color: 'red'},
        },
      })

      expect(wrapper.element).toHaveStyle({
        color: 'red',
      })

      expect(wrapper.element).not.toHaveAttribute('css')
    })

    it('should style nested components', () => {
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const ComponentZero = styled('div', {
        stylePortal: 'zero',
      })(
        {
          padding: '10px',
        },
      )

      const Component = styled(ComponentZero, {
        stylePortal: 'sx',
      })(
        ({color}: any) => {
          return {
            color,
          }
        },
      )

      const Component3: StyledFunctionalComponent = (_, {attrs}) => {
        return h(Component, {sx: attrs.sys})
      }

      Component3.stylePortal = 'sys'

      const Component2 = styled(Component3, {
        stylePortal: 'css',
      })(
        ({backgroundColor}: any) => {
          return {
            backgroundColor,
          }
        },
      )

      const wrapper = mount(Component2, {
        props: {
          css: {
            backgroundColor: 'blue',
            color: 'red', left: '10px',
          },
          key: 'foo',
        },
      })

      expect(wrapper.element).toHaveStyle({
        backgroundColor: 'blue',
        color: 'red',
        padding: '10px',
      })

      expect(wrapper.element).not.toHaveAttribute('css')
    })

    it('should style with default props', () => {
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const Component = styled('div', {
        props: {
          backgroundColor: {default: 'blue', type: String},
          color: {default: 'red', type: String},
        },
        stylePortal: 'sx',
      })(
        ({color}: any) => {
          return {
            color,
          }
        },
        ({backgroundColor}: any) => {
          return {
            backgroundColor,
          }
        },
      )
      const wrapper = mount(Component, {
        props: {
          sx: {backgroundColor: 'red'},
        },
      })
      expect(wrapper.element).toHaveStyle({
        backgroundColor: 'red',
        color: 'red',
      })
    })

    it('should deep as', () => {
      const styled = createStyled(createEmotionOriginal({key: 'css'}))

      const Component1 = styled('div', {
        name: 'Component1',
        stylePortal: 'css',
      })(
        {
          backgroundColor: 'red',
          height: 50,
          width: 50,
        },
      )
      const Component2 = styled('div', {
        name: 'Component2',
        stylePortal: 'css',
      })({
        backgroundColor: 'blue',
        height: 50,
        width: 50,
      })
      const Component3 = styled('div', {
        name: 'Component3',
        stylePortal: 'css',
      })({
        backgroundColor: 'green',
        height: 50,
        width: 50,
      })

      const Component4 = defineComponent({
        name: 'Component4',
        setup() {
          return () => h(Component3, () => [
            h(Component2, () => [
              h(Component1),
            ]),
          ])
        },
      })

      const Component5 = styled(Component4, {
        name: 'Component5',
        passAs: true,
        stylePortal: 'css',
      })({
        backgroundColor: 'yellow',
        height: 50,
        width: 50,
      })

      const Component6 = defineComponent({
        name: 'Component6',
        setup() {
          return () => h(Component5)
        },
      })

      const wrapper = mount(Component6, {
        props: {as: 'button'},
      })

      expect(wrapper.element).toMatchSnapshot()
    })
  })
  describe('vue emotion plugin', () => {
    const setup = (theme?: Record<any, any>) => {
      const emotion = createEmotion({key: 'css', theme})
      const Bar = emotion.styled('div')((props: any) => {
        return {
          width: props.theme?.sizes.md,
        }
      })
      const Component = defineComponent({
        setup() {
          return () => (
            h(Bar, {id: 'text'}, () => 'hello')
          )
        },
      })
      const app = createApp(Component)

      return {
        app,
        emotion,
      }
    }
    it('should return the emotion and a vue emotion plugin', () => {
      const {emotion, app} = setup()
      expect(typeof emotion.styled).toBe('function')

      expect(app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe(undefined)
      app.use(emotion)
      expect(typeof app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe('object')
    })
    it('should provide the theme', () => {
      const {emotion, app} = setup({sizes: {md: '20px'}})
      expect(typeof emotion.styled).toBe('function')
      expect(app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe(undefined)
      app.use(emotion)
      const element = document.createElement('div')
      document.body.append(element)
      app.mount(element)
      expect(typeof app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe('object')
      expect(element.querySelector('#text')).toHaveStyle({
        width: '20px',
      })
    })
    it('should provide the theme by a plugin options', () => {
      const {emotion, app} = setup()
      expect(typeof emotion.styled).toBe('function')
      expect(app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe(undefined)
      app.use(emotion, {theme: {sizes: {md: '20px'}}})
      const element = document.createElement('div')
      document.body.append(element)
      app.mount(element)
      expect(typeof app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe('object')
      expect(element.querySelector('#text')).toHaveStyle({
        width: '20px',
      })
    })
  })
})
