import {atom} from '../atom'
import {flushPromises, mount} from '@vue/test-utils'
import {
  defineComponent, ExtractPropTypes, FunctionalComponent, h,
} from 'vue-demi'

describe('atom', () => {
  it('should ', () => {
    const fooAtom = atom('foo')

    expect(fooAtom.value).toBe('foo')
    fooAtom.value = 'bar'
    expect(fooAtom.value).toBe('bar')
  })
  it('should act', () => {
    const fooAtom = atom('foo', (value: string) => {
      return `${value}??`
    })

    expect(fooAtom.value).toBe('foo')
    fooAtom.value = 'bar'
    expect(fooAtom.value).toBe('bar')
    fooAtom.act('john')
    expect(fooAtom.value).toBe('john??')
  })
  it('should act as async', async () => {
    const fooAtom = atom('foo', (value: string) => {
      return Promise.resolve(`${value}??`)
    })

    expect(fooAtom.value).toBe('foo')
    fooAtom.act('john')
    expect(fooAtom.value).toBe('foo')
    await flushPromises()
    expect(fooAtom.value).toBe('john??')
  })
  it('should handle act error', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fooAtom = atom('foo', (value: string) => {
      throw new Error('just error')
    })

    expect(fooAtom.value).toBe('foo')
    const result = fooAtom.act('john')
    expect(result).toBe(false)
    expect(fooAtom.value).toBe('foo')
    expect(fooAtom.error).toEqual(new Error('just error'))
  })
  it('should handle act error as async', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fooAtom = atom('foo', (value: string) => {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject('just error')
    })

    expect(fooAtom.value).toBe('foo')
    const promise = fooAtom.act('john')
    expect(fooAtom.value).toBe('foo')
    expect(promise).resolves.toBe(false)
    await flushPromises()
    expect(fooAtom.value).toBe('foo')
    expect(fooAtom.error).toBe('just error')
  })

  // object
  it('should be able to handle an object state', async () => {
    const fooAtom = atom({
      link: '',
      name: 'foo',
    })

    expect(fooAtom.value).toEqual({link: '', name: 'foo'})
    fooAtom.value = {link: '', name: 'bar'}
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
