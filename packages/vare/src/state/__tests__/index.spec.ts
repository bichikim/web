import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue-demi'
import {isState, state, stateName} from 'src/state'
import {useInfo} from 'src/info'

const setup = () => {

  const foo = state({
    deep: {
      name: 'bar',
    },
    name: 'foo',
  }, 'foo')

  const barNameSetSpy = jest.fn()
  const barNameGetSpy = jest.fn()

  const bar = state(() => {
    let _name = 'bar'
    return {
      deep: {
        get name(): string {
          barNameGetSpy(_name)
          return _name
        },
        set name(value: string) {
          barNameSetSpy(value)
          _name = value
        },
      },
      name: 'bar',
    }
  })

  const FooTestComponent = defineComponent(() => {
    return () => h('div', [
      h('div', {id: 'name'}, foo.name),
      h('div', {id: 'deepName'}, foo.deep.name),
    ])
  })

  const BarTestComponent = defineComponent(() => {
    return () => {
      return (
        h('div', [
          h('div', {id: 'name'}, bar.name),
          h('div', {id: 'deepName'}, bar.deep.name),
        ])
      )
    }
  })

  return {
    BarTestComponent,
    FooTestComponent,
    bar,
    barNameGetSpy,
    barNameSetSpy,
    foo,
  }
}

describe('state', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('has info', () => {
    it('should have info', () => {
      const {foo} = setup()
      const name = useInfo().get(foo)?.name
      const kind = useInfo().get(foo)?.kind
      expect(name).toBe('foo')
      expect(kind).toBe(stateName)
    })
  })

  describe('is state', () => {
    it('should return true', () => {
      const {foo} = setup()
      expect(isState(foo)).toBe(true)
    })
  })

  describe('state in Components', () => {
    it('should reactive', async () => {
      const {foo, FooTestComponent} = setup()
      const wrapper = mount(FooTestComponent)

      expect(
        wrapper.get('#name').text(),
      ).toBe('foo')

      expect(
        wrapper.get('#deepName').text(),
      ).toBe('bar')

      foo.name = 'FOO'

      await flushPromises()

      expect(
        wrapper.get('#name').text(),
      ).toBe('FOO')

      foo.deep.name = 'BAR'

      await flushPromises()

      expect(
        wrapper.get('#deepName').text(),
      ).toBe('BAR')
    })
    it('should reactive with a function initState', async () => {
      const {bar, BarTestComponent, barNameSetSpy, barNameGetSpy} = setup()
      const wrapper = mount(BarTestComponent)

      expect(
        wrapper.get('#name').text(),
      ).toBe('bar')
      expect(
        wrapper.get('#deepName').text(),
      ).toBe('bar')
      expect(
        barNameGetSpy.mock.calls.length,
      ).toBe(1)
      expect(
        barNameGetSpy.mock.calls[0][0],
      ).toBe('bar')
      expect(
        barNameSetSpy.mock.calls.length,
      ).toBe(0)
      bar.deep.name = 'bar1'
      await flushPromises()

      expect(
        wrapper.get('#name').text(),
      ).toBe('bar')

      expect(
        wrapper.get('#deepName').text(),
      ).toBe('bar1')
      expect(
        barNameGetSpy.mock.calls.length,
      ).toBe(3)
      expect(
        barNameSetSpy.mock.calls.length,
      ).toBe(1)
      expect(
        barNameSetSpy.mock.calls[0][0],
      ).toBe('bar1')
    })
  })
})
