import {createStyled, StyledOptions, createEmotion, EMOTION_CACHE_CONTEXT, EMOTION_THEME_CONTEXT} from 'src/index'
import createEmotionOriginal from '@emotion/css/create-instance'
import {mount} from '@vue/test-utils'
import {defineComponent, h, createApp} from 'vue'

describe('emotion', () => {
  describe('createStyled', () => {
    interface Options extends StyledOptions {
      element?: any
      slot?: any
    }

    const setup = (options: Options = {}) => {
      const {slot, element = 'div', ...rest} = options
      const styled = createStyled(createEmotionOriginal({key: 'css'}))
      const StyledComponent = styled(element, {
        props: {
          color: {default: 'red', type: String},
        },
        ...rest,
      })({
        backgroundColor: 'red',
      }, ({color}) => {
        return {
          color,
        }
      })

      const Component = defineComponent(() => {
        return () => (
          h(StyledComponent, () => slot)
        )
      })

      const wrapper = mount(Component)

      return {
        Component,
        StyledComponent,
        wrapper,
      }
    }

    it('should render css and an element', () => {
      const {wrapper} = setup()
      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
      })
    })

    it('should render label', () => {
      const {wrapper} = setup({
        label: 'test',
      })
      expect(wrapper.get('div').classes()[0]).toMatch(/test$/)
    })

    it('should render props', async () => {
      const {wrapper} = setup()
      expect(wrapper.get('div').element).toHaveStyle({
        color: 'red',
      })

      await wrapper.setProps({
        color: 'blue',
      })
      expect(wrapper.get('div').element).toHaveStyle({
        color: 'blue',
      })
    })

    it('should have a name', () => {
      const {StyledComponent} = setup({
        name: 'foo',
      })
      expect(StyledComponent.name).toBe('foo')
    })

    it('should use label instead of name', () => {
      const {StyledComponent} = setup({
        label: 'bar',
      })
      expect(StyledComponent.name).toBe('bar')
    })

    it('should use name "emotion" if it has no name ', () => {
      const {StyledComponent} = setup()
      expect(StyledComponent.name).toBe('emotion')
    })

    it('should render empty slot', () => {
      const {wrapper} = setup()
      expect(wrapper.get('div').text()).toBe('')
    })

    it('should render slot', () => {
      const {wrapper} = setup({slot: 'foo'})
      expect(wrapper.get('div').text()).toBe('foo')
    })

    it('should style a component', () => {
      const MyComponent = defineComponent((_, {attrs}) => {
        return () => (
          h('div', {...attrs})
        )
      })
      const {wrapper} = setup({element: MyComponent})
      expect(wrapper.get('div').text()).toBe('')
      expect(wrapper.get('div').element).toHaveStyle({
        backgroundColor: 'red',
      })
    })

    it('should styled a component with slot', () => {
      const MyComponent = defineComponent((_, {attrs, slots}) => {
        return () => (
          h('div', {...attrs}, slots?.default?.())
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
  })
  describe('createElement', () => {
    const setup = (theme?: Record<any, any>) => {
      const emotion = createEmotion({key: 'css', theme})
      expect(typeof emotion.styled).toBe('function')
      const Component = defineComponent({
        setup() {
          return () => (
            h('div', 'hello')
          )
        },
      })
      const app = createApp(Component)

      return {
        app,
        emotion,
      }
    }
    it('should return emotion & vue emotion plugin', () => {
      const {emotion, app} = setup()
      expect(typeof emotion.styled).toBe('function')

      expect(app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe(undefined)
      app.use(emotion)
      expect(typeof app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe('object')
    })

    describe('vue emotion plugin', () => {
      it('should provide theme', () => {
        const {emotion, app} = setup({sizes: {md: '20px'}})

        expect(app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe(undefined)
        app.use(emotion)
        expect(typeof app._context.provides[EMOTION_THEME_CONTEXT as any]).toBe('object')
      })
    })
  })
  describe('createDefaultProps', () => {
    const setup = () => {
      const withDefaultProps = createDefaultProps(['foo', 'bar'])
      return {
        withDefaultProps,
      }
    }

    it('should return object type props with default props', () => {
      const {withDefaultProps} = setup()

      expect(withDefaultProps(['john', 'ham']))
        .toEqual(['foo', 'bar', 'john', 'ham'])
    })

    it('should return array type props with default props', () => {
      const {withDefaultProps} = setup()
      expect(withDefaultProps({
        ham: {default: 0, type: Number},
        john: {type: String},
      }))
        .toEqual({
          bar: null,
          foo: null,
          ham: {default: 0, type: Number},
          john: {type: String},
        })
    })
  })
})
