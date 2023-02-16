/**
 * @jest-environment jsdom
 */
import {mount} from '@winter-love/vue-test'
import {defineComponent, h, inject, provide, reactive, ref, toRefs} from 'vue'
import {defineContext, preferParentContext} from '../'

describe('defineContext', () => {
  it('should return context with defined context', () => {
    const name = ref('foo')
    const age = ref(10)
    const [useContext, provideContext] = defineContext(reactive({age, name}))

    const component = defineComponent({
      setup: () => {
        const {age, name} = toRefs(useContext())
        return () => h('div', [name.value, age.value])
      },
    })

    const parent = defineComponent({
      setup() {
        const context = provideContext()
        return () => h('div', [h(h(component)), context.name])
      },
    })

    const wrapper = mount(parent)

    expect(wrapper.get('div').text()).toBe('foo10foo')
  })
  it('should return context with none defined context', () => {
    const name = ref('foo')
    const age = ref(10)
    const [useContext, provideContext] = defineContext<{age: number; name: string}>()

    const component = defineComponent({
      setup: () => {
        const {age, name} = toRefs(useContext())
        return () => h('div', [name.value, age.value])
      },
    })

    const parent = defineComponent({
      setup() {
        provideContext(reactive({age, name}))
        return () => h(component)
      },
    })

    const wrapper = mount(parent)

    expect(wrapper.get('div').text()).toBe('foo10')
  })
  it('should consume (get and remove) context with the consume option', () => {
    const name = ref('foo')

    const [useContext, provideContext] = defineContext<{name: string}>(reactive({name}))

    const component = defineComponent({
      setup: () => {
        const {name} = toRefs(useContext({consume: true}))
        return () => h('div', [name.value, h(component2)])
      },
    })

    const component2 = defineComponent({
      setup: () => {
        const {name} = toRefs(useContext() ?? (reactive({}) as any))
        return () => h('div', [name?.value])
      },
    })

    const parent = defineComponent({
      setup() {
        provideContext(reactive({name}))
        return () => h(component)
      },
    })

    const wrapper = mount(parent)

    expect(wrapper.get('div').text()).toBe('foo')
  })
  it('should create if a provided context is empty', () => {
    const name = ref('foo')
    const [useContext] = defineContext<{name: string}>(() => reactive({name}))
    const parent = defineComponent({
      setup() {
        const {name} = toRefs(useContext({createIfEmpty: true}))
        return () => h('div', name.value)
      },
    })

    const wrapper = mount(parent)

    expect(wrapper.get('div').text()).toBe('foo')
  })
  it('should provide and inject context with a function value', () => {
    const name = ref('foo')

    const [inject, provide] = defineContext<{name: string}>()

    const component1 = defineComponent({
      setup: () => {
        const {name} = toRefs(inject())
        // const name = ref('foo')
        return () => h('div', name.value)
      },
    })

    const root1 = defineComponent({
      setup: () => {
        provide(() => reactive({name}))
        return () => h(component1)
      },
    })

    const wrapper1 = mount(root1)
    expect(wrapper1.get('div').text()).toBe('foo')

    const [injectFromRoot, provideFromRoot] = defineContext(() => reactive({name}))

    const component2 = defineComponent({
      setup: () => {
        const {name} = toRefs(injectFromRoot())
        // const name = ref('foo')
        return () => h('div', name.value)
      },
    })

    const root2 = defineComponent({
      setup: () => {
        const context = provideFromRoot()
        return () => h('div', [h(component2), context.name])
      },
    })

    const wrapper2 = mount(root2)
    expect(wrapper2.get('div').text()).toBe('foofoo')
  })
})

describe('preferParentContext', () => {
  const name1 = ref('level1')
  const name2 = ref('level2')
  const [injectContext, provideContext] = defineContext<{name: string}>()
  const provideOrUse = preferParentContext(provideContext)

  const level1 = defineComponent({
    setup(props, {slots}) {
      provideContext(reactive({name: name1}))
      return () => slots.default?.()
    },
  })

  const level2 = defineComponent({
    setup(props, {slots}) {
      provideOrUse(reactive({name: name2}))
      return () => slots.default?.()
    },
  })

  const resultLevel = defineComponent({
    setup() {
      const {name} = toRefs(injectContext())
      return () => h('div', name.value)
    },
  })

  it('should provide parent context', () => {
    const root = defineComponent({
      setup() {
        return () =>
          h(level1, () => [
            //
            h(level2, () => [
              //
              h(resultLevel),
            ]),
          ])
      },
    })
    const wrapper = mount(root)

    expect(wrapper.get('div').text()).toBe('level1')
  })

  it('should provide its context', () => {
    const root = defineComponent({
      setup() {
        return () =>
          h(level2, () => [
            //
            h(resultLevel),
          ])
      },
    })

    const wrapper = mount(root)

    expect(wrapper.get('div').text()).toBe('level2')
  })

  it('should provide parent context with custom provider', () => {
    const CONTEXT_KEY = 'context-key'
    const customProvideOrUse = preferParentContext((props: any) => {
      return provide(CONTEXT_KEY, props)
    }, CONTEXT_KEY)
    const injectContext = (): {name: string} => inject(CONTEXT_KEY)

    const level1 = defineComponent({
      setup(props, {slots}) {
        customProvideOrUse(reactive({name: name1}))
        return () => slots.default?.()
      },
    })

    const level2 = defineComponent({
      setup(props, {slots}) {
        customProvideOrUse(reactive({name: name2}))
        return () => slots.default?.()
      },
    })

    const resultLevel = defineComponent({
      setup() {
        const {name} = toRefs(injectContext())
        return () => h('div', name.value)
      },
    })

    const root = defineComponent({
      setup() {
        return () =>
          h(level1, () => [
            //
            h(level2, () => [
              //
              h(resultLevel),
            ]),
          ])
      },
    })

    const wrapper = mount(root)

    expect(wrapper.get('div').text()).toBe('level1')
  })

  it('should not create provider without key', () => {
    const CONTEXT_KEY = 'context-key'
    expect(() => preferParentContext((props: any) => provide(CONTEXT_KEY, props))).toThrowError(
      'No context key provided',
    )
  })
})
