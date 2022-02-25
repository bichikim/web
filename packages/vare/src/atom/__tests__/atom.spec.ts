import {atom, getAtomActionWatchTarget, getter} from '../'
import {flushPromises, mount} from '@vue/test-utils'
import {
  defineComponent, ExtractPropTypes, FunctionalComponent, h,
  watch,
} from 'vue-demi'
import {useInfo} from 'src/info'
import {expectNotType, expectType} from 'tsd'

describe('atom', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('should be able to nesting atom', () => {
    const fooAtom = atom({
      age: 5,
      bar: atom({
        name: 'bar',
      }, {
        decoName: getter((state) => `??${state.name}`),
        setName: (state, payload: string) => {
          state.name = payload
        },
      }),
      foo: 'foo',
      john: 'john',
    }, {
      setAge: (state, payload: number) => {
        state.age = payload
      },
      setJohn: (state, payload: string) => {
        state.john = payload
      },
    })

    const atomInfo: any = useInfo().get(fooAtom)

    expect([...atomInfo.relates.keys()]).toEqual(['setAge', 'setJohn'])
    expect(atomInfo.kind).toBe('atom')
    expect(fooAtom.bar.name).toBe('bar')
    expect(fooAtom.bar.$.decoName.value).toBe('??bar')
    fooAtom.bar.$.setName('john')
    expect(fooAtom.bar.name).toBe('john')
    fooAtom.$.setJohn('john2')
    expect(fooAtom.john).toBe('john2')

    expectType<((payload: string) => void)>(fooAtom.$.setJohn)
    expectNotType<((state: any, payload: string) => void)>(fooAtom.$.setJohn)
  })
  it('should have value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    expect(fooAtom.name).toBe('foo')
    fooAtom.name = 'bar'
    expect(fooAtom.name).toBe('bar')
  })
  it('should have value with a function source', () => {
    const fooAtom = atom(() => ({
      name: 'foo',
    }))

    expect(fooAtom.name).toBe('foo')
    fooAtom.name = 'bar'
    expect(fooAtom.name).toBe('bar')
  })
  it('should bind value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    const barAtom = atom(fooAtom, (state, payload: string) => {
      state.name = payload
    })

    const johnAtom = atom(fooAtom, {
      decoName: getter((state) => `${state.name}??`),
      setName: (state, payload: string) => {
        state.name = payload
      },
    })

    const fooAtomInfo: any = useInfo().get(fooAtom)
    const barAtomInfo: any = useInfo().get(barAtom)
    const johnAtomInfo: any = useInfo().get(johnAtom)

    expect([...fooAtomInfo.relates.keys()]).toEqual(['default', 'decoName', 'setName'])
    expect([...barAtomInfo.relates.keys()]).toEqual(['default', 'decoName', 'setName'])
    expect([...johnAtomInfo.relates.keys()]).toEqual(['default', 'decoName', 'setName'])

    fooAtom.name = 'bar'
    expect(fooAtom.name).toBe('bar')
    expect(barAtom.name).toBe('bar')
    expect(johnAtom.name).toBe('bar')

    barAtom.name = 'john'

    expect(fooAtom.name).toBe('john')
    expect(barAtom.name).toBe('john')
    expect(johnAtom.name).toBe('john')
  })
  it('should act', () => {
    const fooAtom = atom({
      name: 'foo',
    }, (state, value: string) => {
      state.name = `${value}??`
    })

    expect(fooAtom.name).toBe('foo')
    fooAtom.name = 'bar'
    expect(fooAtom.name).toBe('bar')
    fooAtom.$('john')
    expect(fooAtom.name).toBe('john??')
  })
  it('should act as async', async () => {
    const fooAtom = atom({
      name: 'foo',
    }, (state, value: string) => {
      return Promise.resolve(null).then(() => {
        state.name = `${value}??`
      })
    })

    expect(fooAtom.name).toBe('foo')
    fooAtom.$('john')
    expect(fooAtom.name).toBe('foo')
    await flushPromises()
    expect(fooAtom.name).toBe('john??')
  })
  it('should act with tree actions', () => {
    const fooAtom = atom({
      name: 'foo',
    }, {
      setName: (state, payload: string) => {
        state.name = payload
      },
    })
    expect(fooAtom.name).toBe('foo')
    fooAtom.$.setName('bar')
    expect(fooAtom.name).toBe('bar')
  })
  it('should act with async actions', async () => {
    const fooAtom = atom({
      name: 'foo',
    }, {
      setName: async (state, payload: string) => {
        state.name = payload
      },
    })

    expect(fooAtom.name).toBe('foo')
    await fooAtom.$.setName('bar')
    expect(fooAtom.name).toBe('bar')
  })
  it('should watch atom state', async () => {
    const callback = jest.fn()
    const fooAtom = atom({
      name: 'foo',
    })

    watch(fooAtom, callback)

    fooAtom.name = 'bar'

    await flushPromises()

    expect(callback).toHaveBeenCalled()
  })
  it('should watch atom state with an action', async () => {
    const callback = jest.fn()
    const fooAtom = atom({
      name: 'foo',
    }, (state, payload: string) => {
      state.name = payload
    })

    watch(fooAtom, callback)

    fooAtom.$('bar')

    await flushPromises()

    expect(callback).toHaveBeenCalled()
  })
  it('should return computed values with tree', () => {
    const fooAtom = atom({
      name: 'foo',
    }, {
      decoName: getter((state) => `??${state.name}`),
      setName: (state, payload: string) => {
        state.name = payload
      },
    })

    const name = fooAtom.$.decoName
    expect(name.value).toBe('??foo')
    fooAtom.$.setName('bar')
    expect(name.value).toBe('??bar')
  })
  it('should return computed values with function', () => {
    const fooAtom = atom({
      name: 'foo',
    }, getter((state) => `??${state.name}`))

    const decoName = fooAtom.$
    expect(decoName.value).toBe('??foo')
  })

  it('should watch atom state with a tree action', async () => {
    const callback = jest.fn()
    const fooAtom = atom({
      name: 'foo',
    }, {
      setName: (state, payload: string) => {
        state.name = payload
      },
    })

    watch(fooAtom, callback)

    fooAtom.$.setName('bar')

    await flushPromises()

    expect(callback).toHaveBeenCalled()
  })

  it.skip('should watch atom action', async () => {
    const callback = jest.fn()
    const fooAtom = atom({
      name: 'foo',
    }, (state, payload) => {
      state.name = payload
    })

    watch(getAtomActionWatchTarget(fooAtom), callback)

    fooAtom.$('bar')

    await flushPromises()

    expect(callback).toHaveBeenCalled()
  })
  // object
  it('should be able to handle an object state', async () => {
    const fooAtom = atom({
      link: '',
      name: 'foo',
    })

    expect(fooAtom.link).toBe('')
    expect(fooAtom.name).toBe('foo')
    fooAtom.link = ''
    fooAtom.name = 'bar'
    expect(fooAtom.link).toBe('')
    expect(fooAtom.name).toBe('bar')
    fooAtom.link = 'https://foo.com'
    expect(fooAtom.link).toBe('https://foo.com')
    expect(fooAtom.name).toBe('bar')
  })

  it('should not re-render with an object state', async () => {
    const fooAtom = atom({
      link: '',
      name: 'foo',
    })

    const nameComponentProps = {name: null}

    const NameComponent: FunctionalComponent<ExtractPropTypes<typeof nameComponentProps>> =
      jest.fn((props) => {
        return h('div', {id: 'name'}, props.name)
      })
    NameComponent.props = nameComponentProps

    const linkComponentProps = {link: null}

    const LinkComponent: FunctionalComponent<ExtractPropTypes<typeof linkComponentProps>> = jest.fn((props) => {
      return h('div', {id: 'link'}, props.link)
    })

    LinkComponent.props = linkComponentProps

    const FooComponent = defineComponent({
      name: 'FooComponent',
      setup() {

        return () => (
          h('div', [
            h(LinkComponent, {link: fooAtom.link}),
            h(NameComponent, {name: fooAtom.name}),
          ])
        )
      },
    })

    const wrapper = mount(FooComponent)

    expect(wrapper.get('#link').text()).toBe('')
    expect(wrapper.get('#name').text()).toBe('foo')
    expect(LinkComponent).toBeCalledTimes(1)
    expect(NameComponent).toBeCalledTimes(1)

    fooAtom.name = 'bar'

    await flushPromises()
    expect(LinkComponent).toBeCalledTimes(1)
    expect(NameComponent).toBeCalledTimes(2)
    expect(wrapper.get('#link').text()).toBe('')
    expect(wrapper.get('#name').text()).toBe('bar')
  })
})
