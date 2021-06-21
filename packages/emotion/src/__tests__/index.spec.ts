import {
  createEmotion, createStyled, EMOTION_CACHE_CONTEXT, EMOTION_THEME_CONTEXT, StyledOptions,
} from '../'
import createEmotionOriginal from '@emotion/css/create-instance'
import {mount} from '@vue/test-utils'
import {createApp, defineComponent, h} from 'vue-demi'

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

      const Component = defineComponent({
        setup: (_, {slots}) => {
          return () => (
            h(StyledComponent, () => slots.default?.())
          )
        },
      })

      const wrapper = mount(Component, {slots: {default: () => slot}})

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

    it('should render VueComponent', () => {
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
    it('should return emotion & vue emotion plugin', () => {
      const {emotion, app} = setup()
      expect(typeof emotion.styled).toBe('function')

      expect(app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe(undefined)
      app.use(emotion)
      expect(typeof app._context.provides[EMOTION_CACHE_CONTEXT as any]).toBe('object')
    })

    describe('vue emotion plugin', () => {
      it.only('should provide theme', () => {
        const {emotion, app} = setup({sizes: {md: '20px'}})

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
    })
  })
})
