/**
 * @jest-environment jsdom
 */

import {atom, getAtomActionWatchTarget} from '../'
import {flushPromises, mount} from '@vue/test-utils'
import {
  defineComponent, ExtractPropTypes, FunctionalComponent, h,
  watch,
} from 'vue-demi'

describe('atom', () => {
  it('should be able to nesting atom', () => {
    const fooAtom = atom({
      bar: atom({
        name: 'bar',
      }, {
        setName: (state, payload: string) => {
          state.name = payload
        },
      }),
      foo: 'foo',
      john: 'john',
    }, {
      setJohn: (state, payload: string) => {
        state.john = payload
      },
    })

    expect(fooAtom.bar.name).toBe('bar')
    fooAtom.bar.$.setName('john')
    expect(fooAtom.bar.name).toBe('john')
    fooAtom.$.setJohn('john2')
    expect(fooAtom.john).toBe('john2')
  })
  it('should have value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    expect(fooAtom.name).toBe('foo')
    fooAtom.name = 'bar'
    expect(fooAtom.name).toBe('bar')
  })
  it('should bind value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    const barAtom = atom(fooAtom)

    fooAtom.name = 'bar'
    expect(barAtom.name).toBe('bar')

    barAtom.name = 'john'

    expect(fooAtom.name).toBe('john')
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
        return Promise.resolve()
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
