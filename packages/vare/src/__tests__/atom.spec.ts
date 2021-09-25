/**
 * @jest-environment jsdom
 */

import {atom} from '../atom'
import {flushPromises, mount} from '@vue/test-utils'
import {
  defineComponent, ExtractPropTypes, FunctionalComponent, h,
} from 'vue-demi'

describe('atom', () => {
  it('should have value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    fooAtom.value.name = 'bar'
    expect(fooAtom.value).toEqual({
      name: 'bar',
    })
  })
  it('should bind value', () => {
    const fooAtom = atom({
      name: 'foo',
    })

    const barAtom = atom(fooAtom)

    fooAtom.value.name = 'bar'
    expect(barAtom.value).toEqual({
      name: 'bar',
    })

    barAtom.value.name = 'john'

    expect(fooAtom.value).toEqual({
      name: 'john',
    })
  })
  it('should act', () => {
    const fooAtom = atom({
      name: 'foo',
    }, (state, value: string) => {
      state.name = `${value}??`
    })

    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    fooAtom.value.name = 'bar'
    expect(fooAtom.value).toEqual({
      name: 'bar',
    })
    fooAtom.act('john')
    expect(fooAtom.value).toEqual({
      name: 'john??',
    })
  })
  it('should act as async', async () => {
    const fooAtom = atom({
      name: 'foo',
    }, async (state, value: string) => {
      await Promise.resolve(null)
      state.name = `${value}??`
    })

    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    fooAtom.act('john')
    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    await flushPromises()
    expect(fooAtom.value).toEqual({
      name: 'john??',
    })
  })
  it('should handle act error', () => {
    const fooAtom = atom({
      name: 'foo',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }, (state, value: string) => {
      throw new Error('just error')
    })

    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    const result = fooAtom.act('john')
    expect(result).toBe(false)
    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    expect(fooAtom.error).toEqual(new Error('just error'))
  })
  it('should handle act error as async', async () => {

    const fooAtom = atom({
      name: 'foo',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }, (state, value: string) => {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject('just error')
    })

    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    const promise = fooAtom.act('john')
    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    expect(promise).resolves.toBe(false)
    await flushPromises()
    expect(fooAtom.value).toEqual({
      name: 'foo',
    })
    expect(fooAtom.error).toBe('just error')
  })

  // object
  it('should be able to handle an object state', async () => {
    const fooAtom = atom({
      link: '',
      name: 'foo',
    })

    expect(fooAtom.value).toEqual({link: '', name: 'foo'})
    fooAtom.value.link = ''
    fooAtom.value.name = 'bar'
    expect(fooAtom.value).toEqual({link: '', name: 'bar'})
    fooAtom.value.link = 'https://foo.com'
    expect(fooAtom.value).toEqual({link: 'https://foo.com', name: 'bar'})
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
            h(LinkComponent, {link: fooAtom.value.link}),
            h(NameComponent, {name: fooAtom.value.name}),
          ])
        )
      },
    })

    const wrapper = mount(FooComponent)

    expect(wrapper.get('#link').text()).toBe('')
    expect(wrapper.get('#name').text()).toBe('foo')
    expect(LinkComponent).toBeCalledTimes(1)
    expect(NameComponent).toBeCalledTimes(1)

    fooAtom.value.name = 'bar'

    await flushPromises()
    expect(LinkComponent).toBeCalledTimes(1)
    expect(NameComponent).toBeCalledTimes(2)
    expect(wrapper.get('#link').text()).toBe('')
    expect(wrapper.get('#name').text()).toBe('bar')
  })
})
