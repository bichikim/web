import {defineComponent} from 'vue'
import {createComponentName} from '../'

describe('createComponentName', () => {
  it('should return component name', () => {
    const Component = defineComponent({
      name: 'Foo',
      setup: () => {
        return () => null
      },
    })

    expect(createComponentName(Component)).toBe('Foo')
  })

  it('should return functional component name', () => {
    const Foo = () => {
      return null
    }

    expect(createComponentName(Foo)).toBe('Foo')
  })
})
