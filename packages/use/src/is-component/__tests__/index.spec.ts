import {isComponent} from '../'
import {defineComponent} from 'vue'

describe('isComponent', () => {
  it('should return true for a component', () => {
    expect(
      isComponent(
        defineComponent({
          setup: () => {
            return () => null
          },
        }),
      ),
    ).toBe(true)
  })
  it('should return true for a component (render)', () => {
    expect(
      isComponent(
        defineComponent({
          render: () => null,
        }),
      ),
    ).toBe(true)
  })
  it('should return true for a functional component', () => {
    expect(isComponent(() => null)).toBe(true)
  })
  it('should return true for a component options', () => {
    expect(
      isComponent({
        setup: () => {
          return () => null
        },
      }),
    ).toBe(true)
  })
  it('should return false with none components tag name', () => {
    expect(isComponent('div')).toBe(false)
  })
  it('should return false with none component null', () => {
    expect(isComponent(null)).toBe(false)
  })
  it('should return false with none component undefined', () => {
    expect(isComponent(undefined)).toBe(false)
  })
})
